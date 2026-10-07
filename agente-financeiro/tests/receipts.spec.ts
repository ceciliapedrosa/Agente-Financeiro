import {beforeEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/auth',()=>({getSessionUserId:mocks.session}));
vi.mock('@/lib/db',()=>({db:{receipt:{create:mocks.create},$transaction:async(fn:Function)=>fn({receipt:{create:mocks.create}})}}));
import {POST} from '../src/app/api/receipts/route';
const request=(body:unknown)=>new Request('http://localhost/api/receipts',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.session.mockResolvedValue('owner');mocks.create.mockImplementation(async({data})=>data);});
describe('recurring receipts',()=>{
 it('leaves future receipts pending even when the first is received',async()=>{const r=await POST(request({name:'Salário',category:'Salário',amount:1600,expectedAt:'2026-01-31',recurrence:'MONTHLY',occurrences:3,status:'RECEIVED'}));expect(r.status).toBe(201);expect(mocks.create).toHaveBeenCalledTimes(3);const rows=mocks.create.mock.calls.map(([a])=>a.data);expect(rows[0].receivedAt).not.toBeNull();expect(rows[1].receivedAt).toBeNull();expect(rows[2].receivedAt).toBeNull();expect(rows[1].expectedAt.toISOString().slice(0,10)).toBe('2026-02-28');expect(rows.every(r=>r.userId==='owner')).toBe(true);});
 it('requires authentication',async()=>{mocks.session.mockResolvedValue(null);expect((await POST(request({}))).status).toBe(401);expect(mocks.create).not.toHaveBeenCalled();});
 it('rejects invalid dates before writing',async()=>{expect((await POST(request({name:'Entrada',category:'Outros',amount:1,expectedAt:'2026-02-30'}))).status).toBe(400);expect(mocks.create).not.toHaveBeenCalled();});
});
