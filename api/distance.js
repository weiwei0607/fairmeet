// Vercel Serverless Function — Distance Matrix Proxy
// 前端看不到 Google API key，key 只存在後端環境變數
//
// POST 請求瀏覽器一定會帶 Origin header，所以這裡的 allowlist 有效，
// 能擋掉一般的跨站呼叫；但 curl 可以偽造 Origin，所以真正擋配額暴衝的
// 還是下面的每 IP 每分鐘限流（Distance Matrix 按 origins×destinations 計費，
// 一次最貴可到 250 elements，限流開得比 geocode 更嚴）。
const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN, // 例如 https://fairmeet.vercel.app
  'http://localhost:5173',    // 本地開發
].filter(Boolean);

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 有帶 Origin 但不是自己的網域 → 直接擋（curl 不帶 Origin 時交給限流處理）
  // 「自己的網域」= ALLOWED_ORIGIN 環境變數，或者跟這次請求的 Host 相同
  // （不強制要求設定 ALLOWED_ORIGIN，否則沒設定時會誤擋正式站自己的請求）
  const sameHostOrigin = req.headers.host ? [`https://${req.headers.host}`, `http://${req.headers.host}`] : [];
  if (origin && !ALLOWED_ORIGINS.includes(origin) && !sameHostOrigin.includes(origin)) {
    return res.status(403).json({ error: '來源不允許' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: '請求太頻繁，請稍後再試' });
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
    return res.status(500).json({ error: 'Server misconfigured: missing GOOGLE_MAPS_API_KEY' });
  }

  const origStr = persons.map(o => `${o.lat},${o.lng}`).join('|');
  const destStr = candidates.map(d => `${d.lat},${d.lng}`).join('|');
  const gmMode = mode === 'driving' ? 'driving' : mode === 'walking' ? 'walking' : 'transit';

  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origStr)}&destinations=${encodeURIComponent(destStr)}&mode=${gmMode}&key=${key}&language=zh-TW`;

  try {
    const gmRes = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await gmRes.json();

    if (data.status !== 'OK') {
      // 不把 Google 的原文狀態碼 / error_message 直接丟回前端（可能透露帳單/金鑰設定細節）。
      return res.status(502).json({ error: 'distance upstream unavailable' });
    }

    const matrix = data.rows.map(row =>
      row.elements.map(el => (el.status === 'OK' ? Math.round(el.duration.value / 60) : null))
    );

    res.status(200).json({ matrix });
  } catch (e) {
    const isTimeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    res.status(isTimeout ? 504 : 500).json({ error: isTimeout ? 'upstream timeout' : 'proxy failed' });
  }
}
