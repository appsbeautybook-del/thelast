import apiClient from './apiClient';
async function invokeLLMBackend({ prompt, response_json_schema, file_urls }) {
  const result = await apiClient.post('/api/ai/invoke-llm', { prompt, response_json_schema, file_urls });
  return result.result;
}
async function generateSpeechBackend({ text }) {
  const audio = await apiClient.request('/api/ai/tts', { method: 'POST', body: JSON.stringify({ text }), responseType: 'blob' });
  return { url: URL.createObjectURL(audio) };
}
if (typeof window !== 'undefined') {
  window.base44 ||= { integrations: { Core: {} } };
  window.base44.integrations ||= { Core: {} };
  window.base44.integrations.Core ||= {};
  Object.assign(window.base44.integrations.Core, { InvokeLLM: invokeLLMBackend, GenerateSpeech: generateSpeechBackend });
}
export { invokeLLMBackend, generateSpeechBackend };
