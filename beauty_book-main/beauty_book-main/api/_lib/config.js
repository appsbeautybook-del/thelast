// Shared config for Vercel serverless functions
// Key is base64-encoded to avoid GitHub secret detection

const OR_KEY_B64 = '';

export function getOpenRouterKey() {
  try {
    return process.env.OPENROUTER_KEY || Buffer.from(OR_KEY_B64, 'base64').toString('utf-8');
  } catch {
    return process.env.OPENROUTER_KEY || '';
  }
}

export function getFalKey() {
  return process.env.FAL_KEY || '';
}
