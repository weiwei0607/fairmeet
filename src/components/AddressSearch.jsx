// ─────────────────────────────────────────────
//  components/AddressSearch.jsx v2 — 視覺升級
// ─────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { searchAddress } from '../utils/geocode';

export default function AddressSearch({ onSelect, placeholder = '搜尋地址或地點名稱…' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const timer = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await searchAddress(query);
      setResults(res);
      setOpen(true);
      setFocusedIdx(-1);
      setLoading(false);
    }, 450);
  }, [query]);

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
    setFocusedIdx(-1);
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && focusedIdx >= 0) { e.preventDefault(); handleSelect(results[focusedIdx]); }
    else if (e.key === 'Escape') { setOpen(false); setFocusedIdx(-1); }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={inputStyle}
          autoComplete="off"
        />
        {loading && (
          <span className="spinner" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14 }} />
        )}
        {!loading && query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus(); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, lineHeight: 1 }}
          >✕</button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={dropdown} className="animate-scale-in">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r)}
              style={{
                ...dropdownItem,
                background: i === focusedIdx ? 'var(--surface3)' : 'transparent',
                borderLeft: i === focusedIdx ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={() => setFocusedIdx(i)}
              onMouseLeave={() => setFocusedIdx(-1)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: 'var(--muted)', fontSize: 13, marginTop: 1, flexShrink: 0 }}>📍</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', textAlign: 'left', fontWeight: 500 }}>{r.shortLabel}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'left', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                    {r.label}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div style={{ ...dropdown, padding: '14px 16px', color: 'var(--muted)', fontSize: 13 }} className="animate-scale-in">
          找不到相符地點，試試更詳細的地址
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
  padding: '10px 36px 10px 14px',
  color: 'var(--text)',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const dropdown = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0, right: 0,
  background: 'var(--surface)',
  border: '1px solid var(--border2)',
  borderRadius: 10,
  zIndex: 200,
  maxHeight: 260,
  overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  overflow: 'hidden',
};

const dropdownItem = {
  display: 'block',
  width: '100%',
  padding: '10px 14px',
  border: 'none',
  borderBottom: '1px solid var(--border)',
  cursor: 'pointer',
  transition: 'background 0.1s',
};
