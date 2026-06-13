// ─────────────────────────────────────────────
//  App.jsx v3 — RWD 行動版 + 視覺全面升級
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
  { value: 'transit', label: '大眾運輸', icon: '🚇' },
  { value: 'driving', label: '開車',     icon: '🚗' },
  { value: 'walking', label: '步行',     icon: '🚶' },
];

const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
};

export default function App() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('plan');
  const [mobileStep, setMobileStep] = useState(0); // 0=人員 1=地點 2=結果
  const [persons, setPersons] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [mode, setMode] = useState('transit');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [groups, setGroups] = useState({});
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [debtSummary, setDebtSummary] = useState(null);
  const [useDebt, setUseDebt] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => { setGroups(loadGroups()); }, []);
  useEffect(() => {
    if (activeGroupId) setDebtSummary(getDebtSummary(activeGroupId));
    else setDebtSummary(null);
  }, [activeGroupId, groups]);

  function addPerson(item) {
    setPersons(prev => [...prev, { name: item.name || item.shortLabel, label: item.shortLabel, lat: item.lat, lng: item.lng, city: item.city }]);
    setResults(null);
  }
  function removePerson(idx) { setPersons(prev => prev.filter((_, i) => i !== idx)); setResults(null); }
  function addCandidate(item) { setCandidates(prev => [...prev, { name: item.shortLabel, lat: item.lat, lng: item.lng }]); setResults(null); }
  function removeCandidate(idx) { setCandidates(prev => prev.filter((_, i) => i !== idx)); setResults(null); }

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
      if (useDebt && debtSummary) ranked = applyDebtCompensation(ranked, debtSummary);
      setResults(ranked);
      if (isMobile) setMobileStep(2);
    } catch (e) {
      setError('計算失敗，請檢查網路連線或稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [persons, candidates, mode, useDebt, debtSummary, isMobile]);

  function handleRecordMeetup() {
    if (!activeGroupId || !results) return;
    const top = results[0];
    recordMeetup(activeGroupId, {
      location: top.candidate.name,
      date: new Date().toISOString(),
      times: top.times,
      city: persons[0]?.city || 'default',
    });
    setGroups(loadGroups());
    alert(`✓ 已記錄！${top.candidate.name} 的虧欠值已更新。`);
  }

  const mapCenter = candidates.length > 0
    ? { lat: candidates.reduce((s, c) => s + c.lat, 0) / candidates.length, lng: candidates.reduce((s, c) => s + c.lng, 0) / candidates.length }
    : DEFAULT_CENTER;

  const maxFairScore = results ? Math.max(...results.map(r => r.fairScore)) : 1;
  const groupList = Object.values(groups);
  const canCalculate = persons.length >= 2 && candidates.length > 0;
  const stepLabels = ['加入參與者', '選集合點', '查看結果'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: isMobile ? '12px 16px' : '14px 28px',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(13,21,32,0.95)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #3ef0a0 0%, #1ad97a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>📍</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: isMobile ? 14 : 16, color: 'var(--text)', lineHeight: 1.1 }}>約哪裡公平</div>
            <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: 2, fontFamily: 'var(--font-display)' }}>FAIRMEET</div>
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: 'flex', gap: 2, marginLeft: 8, background: 'var(--surface2)', borderRadius: 8, padding: 3 }}>
            {[['plan', '規劃'], ['groups', '群組']].map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '5px 16px', borderRadius: 6, border: 'none',
                background: tab === t ? 'var(--surface3)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: tab === t ? 600 : 400,
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}>{label}</button>
            ))}
          </div>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-display)' }}>🔒 後端加密</span>
        </div>
      </header>

      {/* Mobile step indicator */}
      {isMobile && tab === 'plan' && (
        <div style={{ padding: '12px 20px 4px', display: 'flex', alignItems: 'center' }}>
          {stepLabels.map((label, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < stepLabels.length - 1 ? 1 : 0 }}>
              <button
                onClick={() => {
                  if (i < mobileStep) setMobileStep(i);
                  else if (i === 1 && persons.length >= 2) setMobileStep(1);
                  else if (i === 2 && results) setMobileStep(2);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', padding: '4px 2px', cursor: 'pointer',
                  opacity: i > mobileStep && !(i === 1 && persons.length >= 2) ? 0.35 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: i === mobileStep ? 'var(--accent)' : i < mobileStep ? 'rgba(62,240,160,0.15)' : 'var(--surface2)',
                  border: `2px solid ${i === mobileStep ? 'var(--accent)' : i < mobileStep ? 'rgba(62,240,160,0.4)' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                  color: i === mobileStep ? '#000' : i < mobileStep ? 'var(--accent)' : 'var(--muted)',
                  transition: 'all 0.2s ease',
                }}>{i < mobileStep ? '✓' : i + 1}</div>
                <span style={{ fontSize: 10, color: i === mobileStep ? 'var(--accent)' : 'var(--muted)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              </button>
              {i < stepLabels.length - 1 && (
                <div style={{ flex: 1, height: 2, margin: '0 4px', marginBottom: 18, background: i < mobileStep ? 'var(--accent)' : 'var(--border)', borderRadius: 2, transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main */}
      {tab === 'plan' ? (
        isMobile ? (
          /* ── Mobile layout ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: 60 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>

              {mobileStep === 0 && (
                <div className="animate-fade-in">
                  <SectionLabel>參與者出發地</SectionLabel>
                  <PersonSearch onAdd={addPerson} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {persons.map((p, i) => <PersonTag key={i} person={p} index={i} onRemove={() => removePerson(i)} />)}
                  </div>
                  {persons.length === 0 && <EmptyHint icon="👥" text="輸入暱稱和出發地址，加入第一位參與者" />}
                  {persons.length === 1 && <EmptyHint icon="＋" text="再加入一位才能計算" />}
                </div>
              )}

              {mobileStep === 1 && (
                <div className="animate-fade-in">
                  <SectionLabel>交通方式</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
                    {TRANSPORT_MODES.map(m => <TransportButton key={m.value} m={m} active={mode === m.value} onClick={() => setMode(m.value)} />)}
                  </div>
                  <SectionLabel>候選集合點</SectionLabel>
                  <AddressSearch onSelect={addCandidate} placeholder="搜尋集合點…" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {candidates.map((c, i) => <CandidateTag key={i} candidate={c} index={i} onRemove={() => removeCandidate(i)} />)}
                  </div>
                  {candidates.length === 0 && <EmptyHint icon="📍" text="搜尋並新增候選集合點" />}
                  {groupList.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                      <SectionLabel>套用歷史補償（選填）</SectionLabel>
                      <select value={activeGroupId || ''} onChange={e => { setActiveGroupId(e.target.value || null); setUseDebt(!!e.target.value); }} style={selectStyle}>
                        <option value="">不套用群組</option>
                        {groupList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {mobileStep === 2 && results && (
                <div className="animate-fade-in">
                  <MapView candidates={candidates} rankedResults={results} center={mapCenter} />
                  <PrivacyNotice hasDebt={results[0]?.debtAdjusted} />
                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>集合點排行</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {results.map((r, i) => <ResultCard key={r.candidate.name} result={r} rank={i + 1} maxFairScore={maxFairScore} isTop={i === 0} />)}
                    </div>
                    {activeGroupId && <button onClick={handleRecordMeetup} style={{ ...outlineBtn, width: '100%', marginTop: 12 }}>✓ 記錄這次聚會到群組</button>}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action */}
            <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'rgba(7,11,18,0.97)', backdropFilter: 'blur(12px)', zIndex: 99 }}>
              {mobileStep === 0 && (
                <button onClick={() => persons.length >= 2 && setMobileStep(1)} disabled={persons.length < 2} style={persons.length >= 2 ? primaryBtn : disabledBtn}>
                  下一步：新增集合點 →
                </button>
              )}
              {mobileStep === 1 && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setMobileStep(0)} style={{ ...outlineBtn, padding: '13px 16px', flexShrink: 0 }}>←</button>
                  <button onClick={calculate} disabled={!canCalculate || loading} style={canCalculate && !loading ? { ...primaryBtn, flex: 1 } : { ...disabledBtn, flex: 1 }}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />計算中…</> : '計算最公平集合點 ✦'}
                  </button>
                </div>
              )}
              {mobileStep === 2 && (
                <button onClick={() => setMobileStep(1)} style={{ ...outlineBtn, width: '100%' }}>← 修改條件</button>
              )}
              {error && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--warn)', textAlign: 'center' }}>{error}</div>}
            </div>
          </div>
        ) : (
          /* ── Desktop layout ── */
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
              width: 340, flexShrink: 0,
              borderRight: '1px solid var(--border)',
              padding: '24px 20px',
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 24,
              background: 'rgba(13,21,32,0.6)',
            }}>
              <section>
                <SectionLabel>參與者出發地</SectionLabel>
                <PersonSearch onAdd={addPerson} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {persons.map((p, i) => <PersonTag key={i} person={p} index={i} onRemove={() => removePerson(i)} />)}
                </div>
                {persons.length < 2 && <EmptyHint icon="👥" text={persons.length === 0 ? '輸入暱稱和地址加入參與者' : '再加一位就可以計算了'} />}
              </section>

              <Divider />

              <section>
                <SectionLabel>交通方式</SectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {TRANSPORT_MODES.map(m => <TransportButton key={m.value} m={m} active={mode === m.value} onClick={() => setMode(m.value)} />)}
                </div>
              </section>

              <Divider />

              <section>
                <SectionLabel>候選集合點</SectionLabel>
                <AddressSearch onSelect={addCandidate} placeholder="搜尋集合點…" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {candidates.map((c, i) => <CandidateTag key={i} candidate={c} index={i} onRemove={() => removeCandidate(i)} />)}
                </div>
                {candidates.length === 0 && <EmptyHint icon="📍" text="搜尋並新增候選集合點" />}
              </section>

              {groupList.length > 0 && (
                <>
                  <Divider />
                  <section>
                    <SectionLabel>套用歷史補償</SectionLabel>
                    <select value={activeGroupId || ''} onChange={e => { setActiveGroupId(e.target.value || null); setUseDebt(!!e.target.value); }} style={selectStyle}>
                      <option value="">不套用群組</option>
                      {groupList.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    {debtSummary && debtSummary.historyCount > 0 && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)' }}>✓ 套用 {debtSummary.historyCount} 次歷史補償</div>
                    )}
                  </section>
                </>
              )}

              <button onClick={calculate} disabled={!canCalculate || loading} style={canCalculate && !loading ? primaryBtn : disabledBtn}>
                {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />計算中…</> : '計算最公平集合點 ✦'}
              </button>
              {error && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: -12 }}>{error}</div>}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {results ? (
                <div className="animate-fade-in">
                  <MapView candidates={candidates} rankedResults={results} center={mapCenter} />
                  <PrivacyNotice hasDebt={results[0]?.debtAdjusted} />
                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>集合點排行</SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {results.map((r, i) => <ResultCard key={r.candidate.name} result={r} rank={i + 1} maxFairScore={maxFairScore} isTop={i === 0} />)}
                    </div>
                    {activeGroupId && <button onClick={handleRecordMeetup} style={{ ...outlineBtn, marginTop: 12 }}>✓ 記錄這次聚會到群組</button>}
                  </div>
                </div>
              ) : (
                <DesktopEmptyState persons={persons} candidates={candidates} loading={loading} />
              )}
            </div>
          </div>
        )
      ) : (
        /* ── Groups tab ── */
        <div style={{ padding: isMobile ? '20px 16px 80px' : '28px', maxWidth: 640 }} className="animate-fade-in">
          <SectionLabel>我的群組</SectionLabel>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.7 }}>
              先在「規劃」頁加入參與者，再建立群組追蹤每人的歷史虧欠。
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="群組名稱（如：大學同學）" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateGroup()} style={{ ...inputStyle, flex: 1 }} />
              <button onClick={handleCreateGroup} disabled={!newGroupName.trim() || persons.length < 2} style={newGroupName.trim() && persons.length >= 2 ? { ...primaryBtn, width: 'auto', padding: '10px 20px', flexShrink: 0 } : { ...disabledBtn, width: 'auto', padding: '10px 20px', flexShrink: 0 }}>建立</button>
            </div>
            {persons.length < 2 && <div style={{ fontSize: 11, color: 'var(--warn)', marginTop: 8 }}>⚠ 請先在規劃頁加入至少 2 位參與者</div>}
          </div>
          {groupList.length === 0 ? (
            <EmptyHint icon="👥" text="還沒有群組，先建立一個吧" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {groupList.map((g, gi) => {
                const summary = getDebtSummary(g.id);
                return (
                  <div key={g.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20 }} className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, flex: 1 }}>{g.name}</div>
                      <span className="badge badge-accent">{g.members.length} 人</span>
                      <span className="badge" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>{g.history?.length || 0} 次</span>
                    </div>
                    <DebtDashboard summary={summary} groupId={g.id} onUpdate={() => setGroups(loadGroups())} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', borderTop: '1px solid var(--border)',
          background: 'rgba(7,11,18,0.97)', backdropFilter: 'blur(16px)',
          zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {[['plan', '規劃', '🗺'], ['groups', '群組', '👥']].map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '10px 0', background: 'none', border: 'none',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: tab === t ? 600 : 400,
              transition: 'color 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────

function PersonSearch({ onAdd }) {
  const [name, setName] = useState('');
  const [pending, setPending] = useState(null);
  function handleSelect(item) {
    if (name.trim()) { onAdd({ ...item, name: name.trim() }); setName(''); setPending(null); }
    else setPending(item);
  }
  function confirmAdd() {
    if (pending && name.trim()) { onAdd({ ...pending, name: name.trim() }); setName(''); setPending(null); }
  }
  return (
    <div style={{ marginBottom: 4 }}>
      <input placeholder="暱稱（如：小明）" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} maxLength={12} />
      <AddressSearch onSelect={handleSelect} placeholder="搜尋出發地址…" />
      {pending && name.trim() && (
        <button onClick={confirmAdd} style={{ ...primaryBtn, marginTop: 8, fontSize: 13 }}>
          ＋ 加入 {name}（{pending.shortLabel}）
        </button>
      )}
    </div>
  );
}

function PersonTag({ person, index, onRemove }) {
  const colors = ['#3ef0a0', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c'];
  const color = colors[index % colors.length];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${color}20`, border: `1.5px solid ${color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>
        {person.name.slice(0, 1)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{person.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.label}</div>
      </div>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '4px 6px', borderRadius: 6, fontSize: 14, lineHeight: 1, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
      >✕</button>
    </div>
  );
}

function CandidateTag({ candidate, index, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent2)', fontFamily: 'var(--font-display)' }}>
        {index + 1}
      </div>
      <span style={{ fontSize: 13, flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{candidate.name}</span>
      <button onClick={onRemove} style={{ background: 'none', border: 'none', color: 'var(--muted)', padding: '4px 6px', borderRadius: 6, fontSize: 14, lineHeight: 1, cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
      >✕</button>
    </div>
  );
}

function TransportButton({ m, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
      border: `1.5px solid ${active ? 'rgba(62,240,160,0.5)' : 'var(--border)'}`,
      background: active ? 'rgba(62,240,160,0.08)' : 'var(--surface2)',
      color: active ? 'var(--accent)' : 'var(--muted)',
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: active ? 600 : 400,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 0 12px rgba(62,240,160,0.12)' : 'none',
    }}>
      <span style={{ fontSize: 18 }}>{m.icon}</span>
      {m.label}
    </button>
  );
}

function PrivacyNotice({ hasDebt }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', background: 'rgba(62,240,160,0.03)', border: '1px solid rgba(62,240,160,0.1)', borderRadius: 8, padding: '8px 14px', marginTop: 14 }}>
      🔒 只顯示集合點，不顯示任何人的出發位置
      {hasDebt && <span style={{ color: 'var(--accent)' }}>· ⚖ 已套用歷史補償</span>}
    </div>
  );
}

function DesktopEmptyState({ persons, candidates, loading }) {
  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--muted)' }}>正在計算最公平路線…</div>
      </div>
    );
  }
  const step = persons.length < 2
    ? { icon: '👥', title: '加入參與者', sub: '在左側輸入每位參與者的出發地址' }
    : candidates.length === 0
      ? { icon: '📍', title: '新增候選集合點', sub: '搜尋你們可能想聚會的地點' }
      : { icon: '✦', title: '準備就緒', sub: '點擊「計算最公平集合點」' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 }}>
      <div style={{ fontSize: 52, opacity: 0.4 }}>{step.icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, opacity: 0.5 }}>{step.title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', maxWidth: 280 }}>{step.sub}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: 2.5, textTransform: 'uppercase', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 10 }}>
      {children}
    </div>
  );
}

function EmptyHint({ icon, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', padding: '10px 4px' }}>
      <span>{icon}</span>{text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 -4px' }} />;
}

const primaryBtn = {
  width: '100%', padding: '13px 20px',
  background: 'linear-gradient(135deg, #3ef0a0 0%, #1ad97a 100%)',
  color: '#030f07', border: 'none', borderRadius: 10,
  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(62,240,160,0.25)', transition: 'all 0.15s ease', letterSpacing: 0.3, cursor: 'pointer',
};
const disabledBtn = {
  width: '100%', padding: '13px 20px',
  background: 'var(--surface2)', color: 'var(--muted)',
  border: '1px solid var(--border)', borderRadius: 10,
  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed',
};
const outlineBtn = {
  padding: '12px 20px', background: 'transparent', color: 'var(--accent)',
  border: '1.5px solid rgba(62,240,160,0.35)', borderRadius: 10,
  fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  transition: 'all 0.15s ease',
};
const inputStyle = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 13px', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};
const selectStyle = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '10px 32px 10px 13px', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: 13, outline: 'none', cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234a6080' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
};
