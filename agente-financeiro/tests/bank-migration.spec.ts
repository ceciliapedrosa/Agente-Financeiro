import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
it('bank migration is repeatable and keeps links isolated with unique item IDs',async()=>{
 const db=new PGlite();try{await db.exec('CREATE TABLE "User" (id TEXT PRIMARY KEY); INSERT INTO "User" VALUES (\'owner\');');const sql=await readFile('scripts/bank-connections.sql','utf8');await db.exec(sql);await db.exec(sql);await db.exec('INSERT INTO "BankConnection" (id,"userId","itemId","expiresAt") VALUES (\'one\',\'owner\',\'item\',NOW());');await expect(db.exec('INSERT INTO "BankConnection" (id,"userId","itemId","expiresAt") VALUES (\'two\',\'owner\',\'item\',NOW());')).rejects.toThrow();const result=await db.query('SELECT COUNT(*)::int AS count FROM "BankConnection"');expect(result.rows).toEqual([{count:1}]);}finally{await db.close();}
},30000);
