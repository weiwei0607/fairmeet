// ─────────────────────────────────────────────
//  utils/distance.js
//  透過後端 Proxy 呼叫 Google Distance Matrix API
//  前端看不到 API key
// ─────────────────────────────────────────────

// Haversine 公式，回傳公里（模擬模式備用）
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// 交通模式係數（直線 km → 預估分鐘）
const MODE_FACTOR = {
  transit: { speed: 25, overhead: 8 },   // 捷運/公車
  driving: { speed: 30, overhead: 3 },   // 開車市區
  walking: { speed: 4,  overhead: 0 },   // 步行
};

function mockTravelMinutes(origin, dest, mode = 'transit') {
  const km = haversineKm(origin, dest);
  const { speed, overhead } = MODE_FACTOR[mode] ?? MODE_FACTOR.transit;
  return Math.round((km / speed) * 60 + overhead);
}

// ── 主要 export ──────────────────────────────
// persons: [{ name, lat, lng }]
// candidates: [{ name, lat, lng }]
// mode: 'transit' | 'driving' | 'walking'
// options.offline: true → 完全不打 API，直接用 Haversine 估算（示範模式用，
//   保證一定成功且不燒 Google 配額）
// 回傳: { matrix, estimated } — matrix[personIndex][candidateIndex] = 分鐘數，
//   estimated=true 代表這是模擬估算值，不是 Google 真實交通時間
export async function getTravelMatrix(persons, candidates, mode = 'transit', options = {}) {
  if (options.offline) {
    return {
      matrix: persons.map(p => candidates.map(c => mockTravelMinutes(p, c, mode))),
      estimated: true,
    };
  }
  try {
    const res = await fetch('/api/distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persons, candidates, mode }),
      signal: AbortSignal.timeout(12000), // 沒有逾時的話，proxy 卡住會讓「計算中」永遠轉圈
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { matrix: data.matrix, estimated: false };
  } catch (e) {
    // 後端失敗時 fallback 到模擬模式，前端會標示「估算值」而不是假裝是真實資料
    console.warn('Distance proxy failed, falling back to mock:', e.message);
    return {
      matrix: persons.map(p => candidates.map(c => mockTravelMinutes(p, c, mode))),
      estimated: true,
    };
  }
}
