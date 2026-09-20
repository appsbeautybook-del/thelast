import { randomUUID } from 'node:crypto';
import { allowedOrigins } from '../config/env.js';
import { HttpError } from '../lib/errors.js';
export function securityHeaders(req, res, next) {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
}
export function corsOptions(env = process.env) {
  const origins = allowedOrigins(env);
  return {
    origin(origin, callback) {
      if (!origin || origins.has(origin)) callback(null, true);
      else callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origine non autorisée.'));
    },
    credentials: false, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
  };
}
// Per-process protection. A distributed ingress limit is also required in production.
export function rateLimit({ windowMs = 60000, max = 60 } = {}) {
  const buckets = new Map();
  let cleanupAt = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now > cleanupAt) {
      for (const [key, value] of buckets) if (value.reset <= now) buckets.delete(key);
      cleanupAt = now + windowMs;
    }
    const key = req.user?.id || req.ip;
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) bucket = { count: 0, reset: now + windowMs };
    bucket.count += 1; buckets.set(key, bucket);
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.reset - now) / 1000)));
      return next(new HttpError(429, 'RATE_LIMITED', 'Trop de demandes. Réessayez dans un instant.'));
    }
    next();
  };
}
