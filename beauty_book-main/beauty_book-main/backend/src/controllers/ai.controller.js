// Retired router: real AI endpoints are authenticated and mounted by src/app.js.
const retired = (_req, res) => res.status(410).json({ code: 'LEGACY_ENDPOINT_REMOVED', error: 'Utilisez l’API BeautyBook sécurisée.' });
export const analyzePhoto = retired;
export const invokeLLM = retired;
export const shAiImageSearch = retired;
export const simulateHairstyle = retired;
export const generateVeoVideo = retired;
