// Vercel Serverless Function — Geocoding Proxy
// 前端看不到 Google API key

const { getClientIP, isRateLimited } = require('./lib/rateLimit');

// 只允許自己的網域跨域呼叫；同源請求（正式部署）不需要 CORS header
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN, // 例如 https://fairmeet.vercel.app
  'http://localhost:5173',    // 本地開發
].filter(Boolean);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15; // 每 IP 每分鐘最多 15 次 geocode

function setCORS(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function rejectCORS(res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(403).json({ error: 'Origin not allowed' });
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';

  if (req.method === 'OPTIONS') {
    setCORS(res, origin);
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enforce CORS: requests with an Origin header must come from allowed origins
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return rejectCORS(res);
  }

  setCORS(res, origin);

  const ip = getClientIP(req);
  if (isRateLimited(ip, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX)) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const q = req.query.q || '';
  if (!q.trim() || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }
  if (q.length > 120) {
    return res.status(400).json({ error: 'Query too long' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&language=zh-TW`;

  try {
    const gmRes = await fetch(url);
    const data = await gmRes.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      // Google 沒給有效結果（API 未啟用 / 未開帳單 / 金鑰問題 / 查無）
      // → 回非 2xx，讓前端 fallback 到免費的 Nominatim（OpenStreetMap），不再卡死
      return res.status(502).json({ error: `geocode upstream: ${data.status}` });
    }

    const results = data.results.map((item) => ({
      label: item.formatted_address,
      shortLabel: item.formatted_address.split('、').slice(0, 2).join('・'),
      lat: item.geometry.location.lat,
      lng: item.geometry.location.lng,
      city: 'default',
    }));

    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failed' });
  }
}
