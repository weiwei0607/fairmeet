// ─────────────────────────────────────────────
//  components/MapView.jsx
//  地圖：只顯示集合候選點，不顯示任何人的起點
//  使用 Leaflet + OpenStreetMap（免費，不需 API key）
// ─────────────────────────────────────────────
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// 修正 Leaflet 預設 icon 路徑問題
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;
      background:${color};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconAnchor: [10, 10],
  });
}

export default function MapView({ candidates, rankedResults, center }) {
  const topCandidate = rankedResults[0]?.candidate;
  const isTopRedFlagged = rankedResults[0]?.redFlag;

  return (
    <div className="fairmeet-map" style={{ height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {/* 暖褐濾鏡：讓冷色 OSM 圖磚融進整體暖色系（不影響標記/圈層） */}
      <style>{`.fairmeet-map .leaflet-tile-pane { filter: sepia(0.35) saturate(0.85) brightness(1.03) hue-rotate(-8deg); }`}</style>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 只畫候選集合點，不畫任何人的起點 */}
        {rankedResults.map((r, i) => {
          const isTop = i === 0;
          const color = r.redFlag ? '#ef4444' : (isTop ? '#3ef0a0' : '#38bdf8');
          return (
            <Marker
              key={r.candidate.name}
              position={[r.candidate.lat, r.candidate.lng]}
              icon={makeIcon(color)}
            >
              <Popup>
                <div style={{ fontFamily: 'sans-serif', fontSize: 13, minWidth: 140 }}>
                  {r.redFlag && (
                    <div style={{ fontWeight: 'bold', color: '#ef4444', marginBottom: 6 }}>
                      🚩 不公平警告 (差距過大)
                    </div>
                  )}
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {isTop ? '✓ ' : ''}{r.candidate.name}
                  </div>
                  <div style={{ color: '#666', fontSize: 12 }}>平均 {r.avg} 分鐘</div>
                  <div style={{ color: '#666', fontSize: 12 }}>最大差距 {r.spread} 分鐘</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 最佳集合點的涵蓋圈（視覺提示） */}
        {topCandidate && (
          <Circle
            center={[topCandidate.lat, topCandidate.lng]}
            radius={800}
            pathOptions={{
              color: isTopRedFlagged ? '#ef4444' : '#3ef0a0',
              fillColor: isTopRedFlagged ? '#ef4444' : '#3ef0a0',
              fillOpacity: 0.05,
              weight: 1
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
