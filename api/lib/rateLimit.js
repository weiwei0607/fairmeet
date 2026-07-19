// Simple in-memory rate limiter for Vercel Serverless Functions.
// NOTE: In-memory maps are reset on serverless cold starts.
// For production-scale apps, use Redis.

const rateLimitMap = new Map();

function getClientIP(req) {
  const vercelIp = req.headers['x-vercel-forwarded-for'];
  if (vercelIp) return vercelIp.split(',')[0].trim();

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();

  const realIp = req.headers['x-real-ip'];
  if (realIp) return realIp.trim();

  return 'unknown';
}

function isRateLimited(ip, windowMs, maxRequests) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) ?? [];
  const valid = timestamps.filter((t) => now - t < windowMs);
  rateLimitMap.set(ip, valid);

  if (valid.length >= maxRequests) {
    return true;
  }

  valid.push(now);
  return false;
}

module.exports = { getClientIP, isRateLimited };
