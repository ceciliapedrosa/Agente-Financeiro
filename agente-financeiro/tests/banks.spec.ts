import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
const mocks=vi.hoisted(()=>({auth:vi.fn(),connection:{findFirst:vi.fn(),updateMany:vi.fn(),update:vi.fn(),delete:vi.fn()}}));
vi.mock('@/lib/auth',()=>({getSessionUserId:mocks.auth}));
vi.mock('@/lib/db',()=>({db:{bankConnection:mocks.connection}}));
import {POST} from '../src/app/api/banks/route';
import {bankAccess,collectSnapshot} from '../src/lib/pluggy';
const itemId='a0922d6f-2007-4169-a181-b961500608db';
const item={id:itemId,status:'UPDATED',connector:{id:200,name:'Test',isSandbox:true}};
const account={id:'account-1',itemId,name:'Test',type:'BANK',number:'12345678',balance:20,currencyCode:'BRL'};
const transaction={id:'t-1',accountId:'account-1',description:'Test',amount:-5,date:'2026-10-01',currencyCode:'BRL',type:'DEBIT',status:'POSTED'};
function request(body:unknown,origin='https://dizi.test'){return new Request('https://dizi.test/api/banks',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});}
function responses(...data:unknown[]){const fetch=vi.fn();data.forEach(d=>fetch.mockResolvedValueOnce(new Response(JSON.stringify(d))));vi.stubGlobal('fetch',fetch);return fetch;}
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('SESSION_SECRET','test-session-secret-at-least-32-characters');vi.stubEnv('BANK_CONNECTIONS_MODE','sandbox');vi.stubEnv('BANK_SANDBOX_USER_IDS','owner');vi.stubEnv('PLUGGY_CLIENT_ID','test');vi.stubEnv('PLUGGY_CLIENT_SECRET','test');mocks.auth.mockResolvedValue('owner');mocks.connection.updateMany.mockResolvedValue({count:1});mocks.connection.update.mockResolvedValue({});mocks.connection.findFirst.mockResolvedValue({id:'link',userId:'owner',itemId,expiresAt:new Date(Date.now()+60000)});});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('is disabled by default and for users outside pilot',()=>{expect(bankAccess('other')).toBe(false);vi.stubEnv('BANK_CONNECTIONS_MODE','');expect(bankAccess('owner')).toBe(false);});
it('rejects unauthenticated requests',async()=>{mocks.auth.mockResolvedValue(null);expect((await POST(request({action:'start'}))).status).toBe(401);});
it('rejects cross-origin mutations',async()=>{expect((await POST(request({action:'start'},'https://other.test'))).status).toBe(403);});
it('scopes lookups to authenticated owner and denies missing links',async()=>{mocks.connection.findFirst.mockResolvedValue(null);expect((await POST(request({action:'refresh',id:'foreign'}))).status).toBe(404);expect(mocks.connection.findFirst).toHaveBeenCalledWith({where:{id:'foreign',userId:'owner'}});});
it('cannot claim an item with a different connect token',async()=>{const fetch=responses();mocks.connection.findFirst.mockResolvedValue({id:'link',itemId:null,expiresAt:new Date(Date.now()+60000),tokenHash:createHash('sha256').update('expected').digest('hex')});expect((await POST(request({action:'complete',id:'link',itemId,connectToken:'other'}))).status).toBe(409);expect(fetch).not.toHaveBeenCalled();});
it('uses the scoped token for ownership proof and refuses real banks',async()=>{const fetch=responses({...item,connector:{...item.connector,isSandbox:false}});mocks.connection.findFirst.mockResolvedValue({id:'link',itemId:null,expiresAt:new Date(Date.now()+60000),tokenHash:createHash('sha256').update('scoped').digest('hex')});expect((await POST(request({action:'complete',id:'link',itemId,connectToken:'scoped'}))).status).toBe(403);expect(fetch.mock.calls[0][1].headers['X-API-KEY']).toBe('scoped');expect(mocks.connection.update).not.toHaveBeenCalled();});
it('rejects concurrent refreshes',async()=>{mocks.connection.updateMany.mockResolvedValue({count:0});expect((await POST(request({action:'refresh',id:'link'}))).status).toBe(409);});
it('collects all cursor pages, deduplicates and masks account number',async()=>{responses(item,{results:[account]},{results:[transaction],next:'?accountId=account-1&after=cursor'},{results:[transaction,{...transaction,id:'t-2'}],next:null});const result=await collectSnapshot(itemId,'key');expect(result.transactions).toHaveLength(2);expect(result.accounts[0].number).toBe('•••• 5678');});
it('rejects transactions belonging to a different account',async()=>{responses(item,{results:[account]},{results:[{...transaction,accountId:'foreign'}],next:null});await expect(collectSnapshot(itemId,'key')).rejects.toThrow('Resposta inválida');});
it('keeps previous snapshot on a provider failure',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}',{status:503})));expect((await POST(request({action:'refresh',id:'link'}))).status).toBe(502);expect(mocks.connection.update).not.toHaveBeenCalled();expect(mocks.connection.updateMany).toHaveBeenLastCalledWith({where:{id:'link',userId:'owner'},data:{busyUntil:null}});});
