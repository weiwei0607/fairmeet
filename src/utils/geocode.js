// ─────────────────────────────────────────────
//  utils/geocode.js
//  透過後端 Proxy 做地址搜尋
//  前端看不到任何 API key
// ─────────────────────────────────────────────

// ── Nominatim 備用（OpenStreetMap，免費不需 API key）──
async function nominatimSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'zh-TW,zh,en',
      'User-Agent': 'FairMeet/1.0 (https://fairmeet.app)',
    },
  });
  const data = await res.json();
  return data.map(item => ({
    label: item.display_name,
    shortLabel: formatShortLabel(item),
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    city: detectCity(item),
  }));
}

function formatShortLabel(item) {
  const a = item.address;
  const parts = [
    a.amenity || a.building || a.road,
    a.suburb || a.neighbourhood || a.city_district,
    a.city || a.town || a.county,
    a.country_code?.toUpperCase(),
  ].filter(Boolean);
  return parts.slice(0, 3).join('・');
}

function detectCity(item) {
  const city = (item.address?.city || item.address?.town || '').toLowerCase();
  if (city.includes('taipei') || city.includes('台北')) return 'taipei';
  if (city.includes('tokyo') || city.includes('東京')) return 'tokyo';
  if (city.includes('osaka') || city.includes('大阪')) return 'osaka';
  if (city.includes('seoul') || city.includes('서울')) return 'seoul';
  if (city.includes('singapore')) return 'singapore';
  if (city.includes('hong kong') || city.includes('香港')) return 'hongkong';
  return 'default';
}

// ── 後端 Proxy（優先）─────────────────────────
async function proxySearch(query) {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

// ── 主要 export ──────────────────────────────
export async function searchAddress(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    return await proxySearch(query);
  } catch {
    // 後端失敗時 fallback 到 Nominatim
    return await nominatimSearch(query);
  }
}
