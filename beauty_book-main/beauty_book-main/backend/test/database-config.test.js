import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseOptions} from '../src/config/pg.js';
test('database connection distinguishes REST from Postgres and preserves TLS verification',()=>{
 assert.throws(()=>databaseOptions({}),{code:'DATABASE_NOT_CONFIGURED'});
 assert.throws(()=>databaseOptions({DATABASE_URL:'https://project.supabase.co/rest/v1/'}),{code:'DATABASE_URL_INVALID'});
 const config=databaseOptions({NODE_ENV:'production',DATABASE_SSL:'disable',DATABASE_URL:'postgresql://postgres:example%40password@db.test.invalid:5432/postgres?sslmode=no-verify'});
 assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.password,'example@password');assert.equal(config.host,'db.test.invalid');
 assert.equal(config.connectionString,undefined);
});
