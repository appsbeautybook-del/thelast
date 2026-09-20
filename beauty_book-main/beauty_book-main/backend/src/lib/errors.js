export class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function assert(condition, status, code, message) {
  if (!condition) throw new HttpError(status, code, message);
}
export const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error instanceof HttpError ? error.status : error.type === 'entity.too.large' ? 413 : 500;
  console.error(JSON.stringify({ event: 'request_error', requestId: req.requestId, status, code: error.code || 'INTERNAL_ERROR' }));
  res.status(status).json({
    error: error instanceof HttpError ? error.message : 'Le service ne peut pas terminer cette opération.',
    code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR', request_id: req.requestId,
  });
}
