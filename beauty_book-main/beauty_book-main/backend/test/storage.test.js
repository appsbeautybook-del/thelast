import test from 'node:test';
import assert from 'node:assert/strict';
import { databaseFixture, users } from './database-fixture.js';

test('private storage remains owner-only even with a historical permissive policy', async () => {
  const db = await databaseFixture();
  try {
    for (const bucket of ['uploads','private-documents','private-images','ai-results']) {
      await db.query('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2),($1,$3)', [bucket, users.client.id+'/photo.png', users.other.id+'/photo.png']);
    }
    await db.as(users.client);
    const { rows } = await db.query('SELECT bucket_id,name FROM storage.objects ORDER BY bucket_id');
    assert.equal(rows.length, 4); // two public uploads, one own document, one own input image
    assert.equal(rows.some(row => row.bucket_id === 'ai-results'), false);
    assert.equal(rows.filter(row => row.bucket_id.startsWith('private')).every(row => row.name.startsWith(users.client.id)), true);
    await db.query('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)', ['private-images', users.client.id+'/new.png']);
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)', ['private-images', users.other.id+'/forged.png']), /row-level security/);
    await assert.rejects(db.query('INSERT INTO storage.objects(bucket_id,name) VALUES($1,$2)', ['ai-results', users.client.id+'/forged.png']), /row-level security/);
    await assert.rejects(db.query('UPDATE storage.objects SET name=$1 WHERE bucket_id=$2 AND name=$3', [users.other.id+'/moved.png','private-images',users.client.id+'/new.png']), /row-level security/);
    const deleted = await db.query('DELETE FROM storage.objects WHERE name=$1 RETURNING id', [users.other.id+'/photo.png']);
    assert.equal(deleted.rows.length, 0);
  } finally { await db.close(); }
});

test('anonymous storage clients can read public uploads but cannot write owned buckets', async () => {
  const db = await databaseFixture();
  try {
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('uploads',$1),('private-images',$1),('ai-results',$1)", [users.client.id+'/photo.png']);
    await db.pg.exec('SET ROLE anon');
    assert.deepEqual((await db.query('SELECT bucket_id FROM storage.objects')).rows, [{ bucket_id: 'uploads' }]);
    await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('uploads','anonymous/photo.png')"), /row-level security/);
  } finally { await db.close(); }
});

test('private buckets remain private and policies of unrelated applications are preserved', async () => {
  const db = await databaseFixture();
  try {
    const { rows } = await db.query('SELECT id,public FROM storage.buckets ORDER BY id');
    assert.equal(rows.filter(bucket => bucket.public).length, 1);
    assert.equal(rows.find(bucket => bucket.public).id, 'uploads');
    await db.query("INSERT INTO storage.buckets(id,name) VALUES('other-app','other-app')");
    await db.as(users.client);
    await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('other-app','existing-behaviour')");
    assert.equal((await db.query("SELECT name FROM storage.objects WHERE bucket_id='other-app'")).rows.length, 1);
  } finally { await db.close(); }
});
