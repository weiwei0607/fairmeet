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
// 回傳: matrix[personIndex][candidateIndex] = 分鐘數
export async function getTravelMatrix(persons, candidates, mode = 'transit') {
  try {
    const res = await fetch('/api/distance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persons, candidates, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.matrix;
  } catch (e) {
    // 後端失敗時 fallback 到模擬模式
    console.warn('Distance proxy failed, falling back to mock:', e.message);
    return Promise.resolve(
      persons.map(p => candidates.map(c => mockTravelMinutes(p, c, mode)))
    );
  }
}
