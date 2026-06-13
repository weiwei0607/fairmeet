// ─────────────────────────────────────────────
//  components/AddressSearch.jsx
//  全球地址搜尋輸入框（Nominatim）
// ─────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { searchAddress } from '../utils/geocode';

export default function AddressSearch({ onSelect, placeholder = '搜尋地址或地點名稱…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  // Debounce 搜尋
  useEffect(() => {
    clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await searchAddress(query);
      setResults(res);
      setOpen(true);
      setLoading(false);
    }, 500);
  }, [query]);

  // 點外面關閉
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(item) {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={inputStyle}
        />
        {loading && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--muted)' }}>
            搜尋中…
          </span>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={dropdown}>
          {results.map((r, i) => (
            <button key={i} onClick={() => handleSelect(r)} style={dropdownItem}>
              <div style={{ fontSize: 13, color: 'var(--text)', textAlign: 'left' }}>{r.shortLabel}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'left', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {r.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle = {
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
const dropdown = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  zIndex: 100,
  maxHeight: 240,
  overflowY: 'auto',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};
const dropdownItem = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'background 0.1s',
};
