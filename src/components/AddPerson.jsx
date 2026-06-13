// ─────────────────────────────────────────────
//  components/AddPerson.jsx
//  新增參與者的輸入卡片
//  隱私設計：顯示時只顯示「暱稱 + 行政區/捷運站」
// ─────────────────────────────────────────────
import { useState } from 'react';

// 台北主要捷運站（快速選擇用）
const MRT_PRESETS = [
  { label: '台北車站', lat: 25.0478, lng: 121.5170 },
  { label: '忠孝復興', lat: 25.0418, lng: 121.5449 },
  { label: '大安森林公園', lat: 25.0330, lng: 121.5349 },
  { label: '中山', lat: 25.0526, lng: 121.5218 },
  { label: '信義安和', lat: 25.0330, lng: 121.5530 },
  { label: '松江南京', lat: 25.0519, lng: 121.5340 },
  { label: '南京三民', lat: 25.0519, lng: 121.5571 },
  { label: '新店', lat: 24.9716, lng: 121.5397 },
  { label: '板橋', lat: 25.0143, lng: 121.4624 },
  { label: '新莊', lat: 25.0366, lng: 121.4497 },
  { label: '三重', lat: 25.0618, lng: 121.4878 },
  { label: '中和', lat: 24.9967, lng: 121.4984 },
];

export default function AddPerson({ onAdd }) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState(null);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'

  function handleAdd() {
    if (!name.trim()) return;
    let loc = null;
    if (mode === 'preset' && selected) {
      loc = selected;
    } else if (mode === 'custom' && customLat && customLng) {
      loc = {
        label: `${parseFloat(customLat).toFixed(3)}, ${parseFloat(customLng).toFixed(3)}`,
        lat: parseFloat(customLat),
        lng: parseFloat(customLng),
      };
    }
    if (!loc) return;

    onAdd({ name: name.trim(), label: loc.label, lat: loc.lat, lng: loc.lng });
    setName('');
    setSelected(null);
    setCustomLat('');
    setCustomLng('');
  }

  return (
    <div style={card}>
      <div style={row}>
        <input
          placeholder="暱稱（如：小明）"
          value={name}
          onChange={e => setName(e.target.value)}
          style={input}
          maxLength={12}
        />
      </div>

      {/* 模式切換 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {['preset', 'custom'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            ...tabBtn,
            borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
            color: mode === m ? 'var(--accent)' : 'var(--muted)',
          }}>
            {m === 'preset' ? '選捷運站' : '輸入座標'}
          </button>
        ))}
      </div>

      {mode === 'preset' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {MRT_PRESETS.map(p => (
            <button key={p.label} onClick={() => setSelected(p)} style={{
              ...chipBtn,
              background: selected?.label === p.label ? 'var(--accent)' : 'var(--surface2)',
              color: selected?.label === p.label ? '#000' : 'var(--text)',
              borderColor: selected?.label === p.label ? 'var(--accent)' : 'var(--border)',
            }}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input placeholder="緯度 (lat)" value={customLat} onChange={e => setCustomLat(e.target.value)} style={{ ...input, flex: 1 }} />
          <input placeholder="經度 (lng)" value={customLng} onChange={e => setCustomLng(e.target.value)} style={{ ...input, flex: 1 }} />
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={!name.trim() || (mode === 'preset' ? !selected : !customLat || !customLng)}
        style={addBtn}
      >
        ＋ 加入
      </button>
    </div>
  );
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '20px',
};
const row = { marginBottom: 12 };
const input = {
  width: '100%',
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  outline: 'none',
};
const tabBtn = {
  padding: '6px 14px',
  borderRadius: 6,
  border: '1px solid',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  transition: 'all 0.15s',
};
const chipBtn = {
  padding: '5px 12px',
  borderRadius: 20,
  border: '1px solid',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  transition: 'all 0.15s',
};
const addBtn = {
  width: '100%',
  padding: '10px',
  background: 'var(--accent)',
  color: '#000',
  border: 'none',
  borderRadius: 8,
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  opacity: 1,
  transition: 'opacity 0.15s',
};
