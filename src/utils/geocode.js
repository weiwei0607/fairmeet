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
    district: formatDistrict(item),
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    city: detectCity(item),
  }));
}

function formatShortLabel(item) {
  const a = item.address || {};
  const parts = [
    item.name || a.amenity || a.building || a.road,
    a.suburb || a.neighbourhood || a.city_district,
    a.city || a.town || a.county,
  ].filter(Boolean);
  // 不附國碼（會在欄位皆空時掉成「TW」）；皆空時用完整地址第一段保底
  if (parts.length === 0) return (item.display_name || '').split(',')[0].trim();
  return parts.slice(0, 3).join('・');
}

// 行政區層級標籤（隱私：只到區/市，不洩漏確切點）
function formatDistrict(item) {
  const a = item.address || {};
  const dist = a.suburb || a.city_district || a.neighbourhood || a.town || a.village;
  const city = a.city || a.county || a.state;
  if (dist && city) return `${city}${dist}`.replace(/\s/g, '');
  return dist || city || null;
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
