// Vercel Serverless Function — Geocoding Proxy
// 前端看不到 Google API key

// 只允許自己的網域跨域呼叫；同源請求（正式部署）不需要 CORS header
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN, // 例如 https://fairmeet.vercel.app
  'http://localhost:5173',    // 本地開發
].filter(Boolean);

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = req.query.q || '';
  if (!q.trim() || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query too short' });
  }
  if (q.length > 120) {
    return res.status(400).json({ error: 'Query too long' });
  }

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return res.status(500).json({ error: 'Server misconfigured: missing GOOGLE_MAPS_API_KEY' });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&language=zh-TW`;

  try {
    const gmRes = await fetch(url);
    const data = await gmRes.json();

    if (data.status !== 'OK') {
      return res.status(200).json({ results: [] }); // 沒結果回空陣列，不報錯
    }

    const results = data.results.map(item => ({
      label: item.formatted_address,
      shortLabel: item.formatted_address.split('、').slice(0, 2).join('・'),
      lat: item.geometry.location.lat,
      lng: item.geometry.location.lng,
      city: 'default',
    }));

    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: 'Proxy failed', message: e.message });
  }
}
