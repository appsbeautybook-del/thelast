import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccount, confirmAccount, resendConfirmation, authMessage, savePendingEmail, pendingEmail } from './accountAccess.mjs';

test('seller and admin signup create an ordinary identity with any valid email domain, no client-assigned role', async () => {
  let sent;
  const client = { auth: { signUp: async input => { sent = input; return { data: { user: { identities: [{}] }, session: null } }; } } };
  assert.equal((await createAccount(client, { email: '  person@example.org ', password: 'long-test-secret', redirectTo: 'http://localhost:5174/admin/login?auth=confirmed' })).status, 'confirmation');
  assert.deepEqual(sent, { email: 'person@example.org', password: 'long-test-secret', options: { emailRedirectTo: 'http://localhost:5174/admin/login?auth=confirmed' } });
});
test('signup distinguishes an existing masked account and immediate sessions', async () => {
  await assert.rejects(createAccount({ auth: { signUp: async () => ({ data: null }) } }, { email: 'a@b.fr' }), /pas abouti/);
  assert.equal((await createAccount({ auth: { signUp: async () => ({ data: { user: { identities: [] } } }) } }, { email: 'a@b.fr' })).status, 'existing');
  const session = { user: { id: 'new-user' } };
  const result = await createAccount({ auth: { signUp: async () => ({ data: { session } }) } }, { email: 'a@b.fr' });
  assert.equal(result.status, 'authenticated'); assert.equal(result.session, session);
});
test('valid confirmation consumes the signup OTP and requires an authenticated session', async () => {
  let sent;
  const session = { user: { id: 'confirmed' }, access_token: 'test-only' };
  const client = { auth: { verifyOtp: async input => { sent = input; return { data: { session } }; } } };
  assert.equal(await confirmAccount(client, ' a@b.fr ', '123 456'), session);
  assert.deepEqual(sent, { email: 'a@b.fr', token: '123456', type: 'signup' });
  await assert.rejects(confirmAccount({ auth: { verifyOtp: async () => ({ data: {} }) } }, 'a@b.fr', '123456'), /ouvert de session/);
});
test('invalid codes make no verification request; expired codes cannot advance', async () => {
  let called = false;
  const client = { auth: { verifyOtp: async () => { called = true; return {}; } } };
  await assert.rejects(confirmAccount(client, 'a@b.fr', 'abc123'), /chiffres/); assert.equal(called, false);
  await assert.rejects(confirmAccount({ auth: { verifyOtp: async () => ({ error: { code: 'otp_expired' } }) } }, 'a@b.fr', '123456'), { code: 'otp_expired' });
});
test('resend retains the correct app callback and propagates rate limiting', async () => {
  let sent;
  await resendConfirmation({ auth: { resend: async input => { sent = input; return {}; } } }, ' a@b.fr ', 'http://localhost:5175/?auth=confirmed');
  assert.deepEqual(sent, { type: 'signup', email: 'a@b.fr', options: { emailRedirectTo: 'http://localhost:5175/?auth=confirmed' } });
  await assert.rejects(resendConfirmation({ auth: { resend: async () => ({ error: { code: 'over_email_send_rate_limit' } }) } }, 'a@b.fr', '/'), { code: 'over_email_send_rate_limit' });
});
test('pending confirmation resumes without persisting passwords and expires after a day', () => {
  const map = new Map(); const storage = { getItem: key => map.get(key), setItem: (key, value) => map.set(key, value) };
  savePendingEmail(storage, 'pending', ' a@b.fr '); assert.equal(pendingEmail(storage, 'pending'), 'a@b.fr');
  assert.deepEqual(Object.keys(JSON.parse(map.get('pending'))).sort(), ['at', 'email']);
  map.set('pending', JSON.stringify({ email: 'a@b.fr', at: Date.now() - 86400001 })); assert.equal(pendingEmail(storage, 'pending'), '');
  map.set('pending', '{'); assert.equal(pendingEmail(storage, 'pending'), '');
});
test('SMTP configuration, unconfirmed accounts and bad credentials produce distinct guidance', () => {
  assert.match(authMessage({ code: 'email_address_not_authorized' }), /service email/);
  assert.match(authMessage({ code: 'email_not_confirmed' }), /Confirmez/);
  assert.match(authMessage({ code: 'invalid_credentials' }), /incorrect/);
  assert.match(authMessage({ code: 'otp_expired' }), /nouveau/);
});
