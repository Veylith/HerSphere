import { AppError } from "../domain/errors.js";

export function createRateLimiter({ windowMs, max }) {
  const buckets = new Map();

  return function rateLimit(key) {
    const now = Date.now();
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      throw new AppError(429, "Too many requests. Please try again shortly.");
    }
  };
}
