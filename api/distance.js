// Vercel Serverless Function — Distance Matrix Proxy
// 前端看不到 Google API key，key 只存在後端環境變數

const { getClientIP, isRateLimited } = require('./lib/rateLimit');

// 只允許自己的網域跨域呼叫；同源請求（正式部署）不需要 CORS header
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN, // 例如 https://fairmeet.vercel.app
  'http://localhost:5173',    // 本地開發
].filter(Boolean);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10; // 每 IP 每分鐘最多 10 次 distance matrix

function setCORS(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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

  if (req.method !== 'POST') {
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

  const { persons, candidates, mode = 'transit' } = req.body || {};
  if (!persons?.length || !candidates?.length) {
    return res.status(400).json({ error: 'Missing persons or candidates' });
  }
  // Distance Matrix 按 origins×destinations 計費，限制矩陣大小防止被刷爆
  if (persons.length > 10 || candidates.length > 25) {
    return res.status(400).json({ error: 'Too many points (max 10 persons × 25 candidates)' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server misconfigured: missing API key' });
  }

  const origStr = persons.map((o) => `${o.lat},${o.lng}`).join('|');
  const destStr = candidates.map((d) => `${d.lat},${d.lng}`).join('|');
  const gmMode = mode === 'driving' ? 'driving' : mode === 'walking' ? 'walking' : 'transit';

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origStr)}&destinations=${encodeURIComponent(destStr)}&mode=${gmMode}&key=${key}&language=zh-TW`;

  try {
    const gmRes = await fetch(url);
    const data = await gmRes.json();

    if (data.status !== 'OK') {
      return res.status(502).json({ error: `Google API error: ${data.status}` });
    }

    const matrix = data.rows.map((row) =>
      row.elements.map((el) => (el.status === 'OK' ? Math.round(el.duration.value / 60) : null))
    );

    res.status(200).json({ matrix });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failed' });
  }
}
