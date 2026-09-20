const FAL_BASE = 'https://queue.fal.run';
const FAL_KEY = process.env.FAL_KEY || '';

export async function submitFalModel(endpoint, payload) {
  if (!FAL_KEY) throw new Error('FAL_KEY non configuré');

  const submitRes = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!submitRes.ok) {
    const errBody = await submitRes.text().catch(() => '');
    throw new Error(`fal.ai submit error ${submitRes.status}: ${errBody.slice(0, 300)}`);
  }
  const { request_id, response_url, status_url } = await submitRes.json();
  if (!request_id) throw new Error('Pas de request_id retourné par fal.ai');

  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(`${FAL_BASE}/${endpoint}/requests/${request_id}/status`, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    });
    if (!statusRes.ok) {
      const errBody = await statusRes.text().catch(() => '');
      throw new Error(`fal.ai status error ${statusRes.status}: ${errBody.slice(0, 300)}`);
    }
    const status = await statusRes.json();
    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(response_url || `${FAL_BASE}/${endpoint}/requests/${request_id}`, {
        headers: { 'Authorization': `Key ${FAL_KEY}` },
      });
      if (!resultRes.ok) throw new Error('fal.ai result fetch failed');
      return await resultRes.json();
    }
    if (status.status === 'FAILED' || status.status === 'CANCELLED') {
      throw new Error(`fal.ai ${status.status}: ${status.error || 'unknown error'}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timeout: fal.ai generation took too long');
}
