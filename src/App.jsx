// ─────────────────────────────────────────────
//  App.jsx v2 — 群組 + 虧欠補償 + 全球地址搜尋
// ─────────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import AddressSearch from './components/AddressSearch';
import ResultCard from './components/ResultCard';
import MapView from './components/MapView';
import DebtDashboard from './components/DebtDashboard';
import { getTravelMatrix } from './utils/distance';
import { rankCandidates } from './utils/fairness';
import { applyDebtCompensation, createGroup, loadGroups, recordMeetup, getDebtSummary } from './utils/debt';
import { DEFAULT_CENTER } from './config';

const TRANSPORT_MODES = [
  { value: 'transit', label: '🚇 大眾運輸' },
  { value: 'driving', label: '🚗 開車' },
  { value: 'walking', label: '🚶 步行' },
];

export default function App() {
  const [tab, setTab] = useState('plan'); // 'plan' | 'groups'
  const [persons, setPersons] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [mode, setMode] = useState('transit');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 群組
  const [groups, setGroups] = useState({});
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [debtSummary, setDebtSummary] = useState(null);
  const [useDebt, setUseDebt] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  // 新增候選點搜尋
  const [candName, setCandName] = useState('');
  const [candCoords, setCandCoords] = useState(null);

  useEffect(() => {
    setGroups(loadGroups());
  }, []);

  useEffect(() => {
    if (activeGroupId) {
      const s = getDebtSummary(activeGroupId);
      setDebtSummary(s);
    } else {
      setDebtSummary(null);
    }
  }, [activeGroupId, groups]);

  function addPerson(item) {
    setPersons(prev => [...prev, { name: item.name || item.shortLabel, label: item.shortLabel, lat: item.lat, lng: item.lng, city: item.city }]);
    setResults(null);
  }

  function removePerson(idx) {
    setPersons(prev => prev.filter((_, i) => i !== idx));
    setResults(null);
  }

  function addCandidate(item) {
    setCandidates(prev => [...prev, { name: item.shortLabel, lat: item.lat, lng: item.lng }]);
    setResults(null);
  }

  function removeCandidate(idx) {
    setCandidates(prev => prev.filter((_, i) => i !== idx));
    setResults(null);
  }

  function handleCreateGroup() {
    if (!newGroupName.trim() || persons.length < 2) return;
    const id = createGroup(newGroupName.trim(), persons);
    setGroups(loadGroups());
    setActiveGroupId(id);
    setNewGroupName('');
  }

  const calculate = useCallback(async () => {
    if (persons.length < 2 || candidates.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const matrix = await getTravelMatrix(persons, candidates, mode);
      let ranked = rankCandidates(candidates, persons, matrix);
      if (useDebt && debtSummary) {
        ranked = applyDebtCompensation(ranked, debtSummary);
      }
      setResults(ranked);
    } catch (e) {
      setError('計算失敗，請檢查網路連線。');
    } finally {
      setLoading(false);
    }
  }, [persons, candidates, mode, useDebt, debtSummary]);

  function handleRecordMeetup() {
    if (!activeGroupId || !results) return;
    const top = results[0];
    const primaryCity = persons[0]?.city || 'default';
    recordMeetup(activeGroupId, {
      location: top.candidate.name,
      date: new Date().toISOString(),
      times: top.times,
      city: primaryCity,
    });
    setGroups(loadGroups());
    alert(`已記錄！${top.candidate.name} 這次的犧牲值已更新到群組。`);
  }

  const mapCenter = candidates.length > 0
    ? { lat: candidates.reduce((s,c) => s+c.lat,0)/candidates.length, lng: candidates.reduce((s,c) => s+c.lng,0)/candidates.length }
    : DEFAULT_CENTER;

  const maxFairScore = results ? Math.max(...results.map(r => r.fairScore)) : 1;
  const groupList = Object.values(groups);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 20, background: 'var(--surface)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18 }}>約哪裡公平</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>FAIRMEET</div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginLeft: 16 }}>
          {[['plan','規劃'], ['groups','群組']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none',
              background: tab === t ? 'var(--accent)' : 'transparent',
              color: tab === t ? '#000' : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', padding: '4px 10px' }}>
          🔒 後端 Proxy 模式
        </div>
      </header>

      {tab === 'plan' && (
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Left */}
          <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid var(--border)', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* 參與者 */}
            <section>
              <SectionLabel>參與者</SectionLabel>
              <PersonSearch onAdd={addPerson} />
              {persons.map((p, i) => (
                <PersonTag key={i} person={p} onRemove={() => removePerson(i)} />
              ))}
              {persons.length < 2 && <Hint>至少需要 2 位參與者</Hint>}
            </section>

            {/* 交通方式 */}
            <section>
              <SectionLabel>交通方式</SectionLabel>
              <div style={{ display: 'flex', gap: 6 }}>
                {TRANSPORT_MODES.map(m => (
                  <button key={m.value} onClick={() => setMode(m.value)} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8,
                    border: `1px solid ${mode === m.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: mode === m.value ? 'rgba(62,240,160,0.08)' : 'var(--surface)',
                    color: mode === m.value ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)',
                  }}>{m.label}</button>
                ))}
              </div>
            </section>

            {/* 候選集合點 */}
            <section>
              <SectionLabel>候選集合點</SectionLabel>
              <AddressSearch onSelect={addCandidate} placeholder="搜尋集合點…" />
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {candidates.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', gap: 8 }}>
                    <span style={{ fontSize: 13, flex: 1 }}>📍 {c.name}</span>
                    <button onClick={() => removeCandidate(i)} style={removeBtn}>✕</button>
                  </div>
                ))}
              </div>
              {candidates.length === 0 && <Hint>搜尋並新增候選集合點</Hint>}
            </section>

            {/* 群組虧欠補償 */}
            {groupList.length > 0 && (
              <section>
                <SectionLabel>套用歷史補償</SectionLabel>
                <select
                  value={activeGroupId || ''}
                  onChange={e => { setActiveGroupId(e.target.value || null); setUseDebt(!!e.target.value); }}
                  style={{ ...selectStyle, marginBottom: 8 }}
                >
                  <option value="">不套用群組</option>
                  {groupList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                {debtSummary && debtSummary.historyCount > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 4 }}>
                    ✓ 已套用 {debtSummary.historyCount} 次聚會的虧欠補償
                  </div>
                )}
              </section>
            )}

            {/* 計算按鈕 */}
            <button
              onClick={calculate}
              disabled={persons.length < 2 || loading || candidates.length === 0}
              style={{
                padding: 14, background: persons.length >= 2 && candidates.length > 0 ? 'var(--accent)' : 'var(--surface2)',
                color: persons.length >= 2 && candidates.length > 0 ? '#000' : 'var(--muted)',
                border: 'none', borderRadius: 10, fontFamily: 'var(--font-display)',
                fontWeight: 800, fontSize: 15, cursor: 'pointer',
              }}
            >
              {loading ? '計算中⋯' : '計算最公平集合點'}
            </button>
            {error && <div style={{ color: 'var(--warn)', fontSize: 13 }}>{error}</div>}
          </div>

          {/* Right */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {results ? (
              <>
                <MapView candidates={candidates} rankedResults={results} center={mapCenter} />
                <div style={{ fontSize: 12, color: 'var(--muted)', background: 'rgba(62,240,160,0.04)', border: '1px solid rgba(62,240,160,0.12)', borderRadius: 8, padding: '8px 14px' }}>
                  🔒 地圖只顯示候選集合點，不顯示任何人的出發位置
                  {results[0]?.debtAdjusted && ' · ⚖ 已套用歷史虧欠補償'}
                </div>
                <SectionLabel>集合點排行</SectionLabel>
                {results.map((r, i) => (
                  <ResultCard key={r.candidate.name} result={r} rank={i+1} maxFairScore={maxFairScore} isTop={i===0} />
                ))}
                {activeGroupId && (
                  <button onClick={handleRecordMeetup} style={{
                    padding: '10px 16px', background: 'transparent',
                    border: '1px solid var(--accent)', color: 'var(--accent)',
                    borderRadius: 8, fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
                  }}>
                    ✓ 記錄這次聚會到群組
                  </button>
                )}
              </>
            ) : (
              <EmptyState persons={persons} candidates={candidates} />
            )}
          </div>
        </div>
      )}

      {tab === 'groups' && (
        <div style={{ padding: 28, maxWidth: 600 }}>
          <SectionLabel>我的群組</SectionLabel>

          {/* 建立群組 */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 24 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              先在「規劃」頁加入參與者，再建立群組來追蹤歷史虧欠。
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="群組名稱（如：大學同學）"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || persons.length < 2}
                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontFamily: 'var(--font-display)', fontWeight: 700, cursor: 'pointer' }}
              >
                建立
              </button>
            </div>
            {persons.length < 2 && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 6 }}>請先在規劃頁加入至少 2 位參與者</div>}
          </div>

          {/* 群組列表 */}
          {groupList.length === 0 ? (
            <Hint>還沒有群組，先建立一個吧</Hint>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groupList.map(g => {
                const summary = getDebtSummary(g.id);
                return (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                      {g.members.length} 人・{g.history?.length || 0} 次聚會記錄
                    </div>
                    <DebtDashboard
                      summary={summary}
                      groupId={g.id}
                      onUpdate={() => setGroups(loadGroups())}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 帶暱稱輸入的地址搜尋
function PersonSearch({ onAdd }) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(null);

  function handleSelect(item) {
    if (name.trim()) {
      onAdd({ ...item, name: name.trim() });
      setName('');
      setPending(null);
    } else {
      setPending(item);
    }
  }

  function confirmAdd() {
    if (pending && name.trim()) {
      onAdd({ ...pending, name: name.trim() });
      setName('');
      setPending(null);
    }
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <input
        placeholder="暱稱（如：小明）"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ ...inputStyle, marginBottom: 6 }}
        maxLength={12}
      />
      <AddressSearch onSelect={handleSelect} placeholder="搜尋這個人的出發地址…" />
      {pending && name.trim() && (
        <button onClick={confirmAdd} style={{ marginTop: 6, width: '100%', padding: '8px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          ＋ 加入 {name}（{pending.shortLabel}）
        </button>
      )}
    </div>
  );
}

function PersonTag({ person, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{person.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{person.label}</div>
      </div>
      <button onClick={onRemove} style={removeBtn}>✕</button>
    </div>
  );
}

function EmptyState({ persons, candidates }) {
  const msg = persons.length < 2 ? '加入至少 2 位參與者' : candidates.length === 0 ? '新增候選集合點' : '按下「計算」';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.4, paddingTop: 80 }}>
      <div style={{ fontSize: 48 }}>📍</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>{msg}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--font-display)', marginBottom: 8 }}>{children}</div>;
}

function Hint({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>{children}</div>;
}

const removeBtn = { background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '2px 4px' };
const inputStyle = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' };
const selectStyle = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none' };
