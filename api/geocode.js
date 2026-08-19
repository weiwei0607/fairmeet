// Vercel Serverless Function — Geocoding Proxy
// 前端看不到 Google API key
//
// 這支 proxy 是公開端點。GET 請求在同源瀏覽器呼叫時不會帶 Origin header
// （Fetch 規格只在跨來源或非安全方法才附加），所以不能靠 Origin allowlist
// 擋掉陌生人直接 curl。真正擋配額暴衝的是下面的每 IP 每分鐘限流。
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN, // 例如 https://fairmeet.vercel.app
  'http://localhost:5173',    // 本地開發
].filter(Boolean);

// 極簡的記憶體內限流：同一個 serverless instance 生命週期內，
// 每個 IP 每分鐘最多打 N 次地址搜尋。重啟/多實例會重置，
// 但足以擋掉單一來源對 Google Maps 配額的暴衝。
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60; // 使用者打字搜尋兩個欄位，debounce 後仍會頻繁呼叫
const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: '請求太頻繁，請稍後再試' });
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
    return res.status(500).json({ error: 'Server misconfigured: missing GOOGLE_MAPS_API_KEY' });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${key}&language=zh-TW`;

  try {
    const gmRes = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await gmRes.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      // Google 沒給有效結果（API 未啟用 / 未開帳單 / 金鑰問題 / 查無）
      // → 回非 2xx，讓前端 fallback 到免費的 Nominatim（OpenStreetMap），不再卡死
      // 不把 Google 的原文狀態碼（可能透露金鑰/帳單設定細節）丟回前端。
      return res.status(502).json({ error: 'geocode upstream unavailable' });
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
    const isTimeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    res.status(isTimeout ? 504 : 500).json({ error: isTimeout ? 'upstream timeout' : 'proxy failed' });
  }
}
