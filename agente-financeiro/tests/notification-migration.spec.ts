import {it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
it('notification migration is additive, repeatable and enforces ownership and deduplication',async()=>{
 const db=new PGlite();try{await db.exec(`CREATE TABLE "User" (id TEXT PRIMARY KEY); INSERT INTO "User" VALUES ('owner');`);const sql=await readFile('scripts/notifications.sql','utf8');await db.exec(sql);await db.exec(sql);await db.exec(`INSERT INTO "NotificationPreference" ("userId") VALUES ('owner'); INSERT INTO "NotificationDelivery" (id,"userId",channel) VALUES ('once','owner','push');`);await expect(db.exec(`INSERT INTO "NotificationDelivery" (id,"userId",channel) VALUES ('once','owner','push');`)).rejects.toThrow();await expect(db.exec(`INSERT INTO "NotificationPreference" ("userId") VALUES ('stranger');`)).rejects.toThrow();expect((await db.query(`SELECT "emailEnabled" FROM "NotificationPreference"`)).rows).toEqual([{emailEnabled:false}]);await db.exec(`DELETE FROM "User" WHERE id='owner';`);expect((await db.query(`SELECT * FROM "NotificationDelivery"`)).rows).toEqual([]);}finally{await db.close();}
},30000);
