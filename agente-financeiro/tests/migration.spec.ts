import { expect,it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
it('history migration is additive, repeatable and enforces parent accounts',async()=>{
 const db=new PGlite();
 try{
 await db.exec('CREATE TABLE "Payment" (id TEXT PRIMARY KEY); INSERT INTO "Payment" VALUES (\'existing\');');
 const sql=await readFile('scripts/payment-history.sql','utf8');
 await db.exec(sql);await db.exec(sql);
 await db.exec(`INSERT INTO "PaymentEvent" (id,"paymentId",amount,"paidAt",kind) VALUES ('event','existing',25,NOW(),'PAYMENT')`);
 expect((await db.query('SELECT * FROM "Payment"')).rows).toHaveLength(1);
 expect((await db.query('SELECT amount FROM "PaymentEvent"')).rows).toEqual([{amount:25}]);
 await expect(db.exec(`INSERT INTO "PaymentEvent" (id,"paymentId",amount,"paidAt",kind) VALUES ('bad','missing',25,NOW(),'PAYMENT')`)).rejects.toThrow();
 }finally{await db.close();}
});
