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
  { value: 'transit', label: '大眾運輸', icon: 'transit' },
  { value: 'driving', label: '開車',     icon: 'car' },
  { value: 'walking', label: '步行',     icon: 'walk' },
];

// ── 線性 SVG 圖示（取代 emoji，統一 currentColor）──
const ICON_PATHS = {
  pin:     'M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  transit: 'M8 4h8a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z M5 11h14 M9 20l-2 1 M15 20l2 1 M8.5 14.5h.01 M15.5 14.5h.01',
  car:     'M5 11l1.5-4A2 2 0 0 1 8.4 5.7h7.2a2 2 0 0 1 1.9 1.3L19 11 M4 11h16v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z M7 14h.01 M17 14h.01',
  walk:    'M13 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M13 8l-3 2 1 4 M11 14l-2 6 M14 12l3 1 M11 10l4 1.5 1 3.5',
  users:   'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M3 20a6 6 0 0 1 12 0 M16 5.5a3 3 0 0 1 0 5.8 M21 20a6 6 0 0 0-4-5.6',
  lock:    'M7 11V8a5 5 0 0 1 10 0v3 M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z',
  map:     'M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z M9 4v14 M15 6v14',
  check:   'M5 12l5 5 9-10',
  target:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M12 12h.01',
  spark:   'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  plus:    'M12 5v14 M5 12h14',
};
function Icon({ name, size = 18, stroke = 1.6, style }) {
  const d = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }} aria-hidden="true">
      {d.split(' M').map((seg, i) => <path key={i} d={(i === 0 ? seg : 'M' + seg)} />)}
    </svg>
  );
}

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
  const [estimated, setEstimated] = useState(false);

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
  function addCandidate(item) { setCandidates(prev => [...prev, { name: item.shortLabel, district: item.district, lat: item.lat, lng: item.lng }]); setResults(null); }
  function removeCandidate(idx) { setCandidates(prev => prev.filter((_, i) => i !== idx)); setResults(null); }

  function handleCreateGroup() {
    if (!newGroupName.trim() || persons.length < 2) return;
    const id = createGroup(newGroupName.trim(), persons);
    if (!id) {
      // 無痕模式 / 儲存空間已滿：localStorage 寫入失敗
      alert('無法儲存群組。無痕模式或瀏覽器儲存空間已滿時無法使用「群組」功能，其他功能不受影響。');
      return;
    }
    setGroups(loadGroups());
    setActiveGroupId(id);
    setNewGroupName('');
  }

  const calculate = useCallback(async (opts = {}) => {
    if (persons.length < 2 || candidates.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const { matrix, estimated: isEstimated } = await getTravelMatrix(persons, candidates, mode, opts);
      let ranked = rankCandidates(candidates, persons, matrix);
      if (useDebt && debtSummary) ranked = applyDebtCompensation(ranked, debtSummary);
      setResults(ranked);
      setEstimated(isEstimated);
      if (isMobile) setMobileStep(2);
    } catch (e) {
      setError('計算失敗，請檢查網路連線或稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [persons, candidates, mode, useDebt, debtSummary, isMobile]);

  // ── 示範模式：不需要準備任何資料就能看到完整流程 ──
  // 預填台北的固定座標、走離線估算路徑（不打 Google API，保證成功且不燒配額）
  const loadDemo = useCallback(() => {
    const demoPersons = [
      { name: '小明', label: '台北車站', lat: 25.0478, lng: 121.5170, city: 'taipei' },
      { name: '小華', label: '公館', lat: 25.0148, lng: 121.5342, city: 'taipei' },
      { name: '阿凱', label: '南港', lat: 25.0546, lng: 121.6066, city: 'taipei' },
    ];
    const demoCandidates = [
      { name: '西門町', district: '台北市萬華區', lat: 25.0421, lng: 121.5079 },
      { name: '大安森林公園', district: '台北市大安區', lat: 25.0296, lng: 121.5352 },
      { name: '市政府', district: '台北市信義區', lat: 25.0375, lng: 121.5637 },
    ];
    setPersons(demoPersons);
    setCandidates(demoCandidates);
    setResults(null);
    if (isMobile) setMobileStep(1);
    // 用下一輪 microtask 觸發計算，確保 state 已更新（calculate 依賴 persons/candidates）
    setTimeout(() => calculateWithData(demoPersons, demoCandidates), 0);
  }, [isMobile]);

  // calculate() 讀的是 state，剛 setPersons 還沒生效前無法直接呼叫，
  // 所以示範模式用這個版本直接吃參數。
  const calculateWithData = useCallback(async (ps, cs) => {
    setLoading(true);
    setError(null);
    try {
      const { matrix, estimated: isEstimated } = await getTravelMatrix(ps, cs, mode, { offline: true });
      const ranked = rankCandidates(cs, ps, matrix);
      setResults(ranked);
      setEstimated(isEstimated);
      if (isMobile) setMobileStep(2);
    } catch (e) {
      setError('計算失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  }, [mode, isMobile]);

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
        background: 'rgba(252,246,238,0.9)',
        backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #ef6b43 0%, #d9531f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', flexShrink: 0,
          }}><Icon name="pin" size={18} stroke={2} /></div>
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

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)' }}>
          <Icon name="lock" size={12} stroke={1.6} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-display)' }}>後端加密</span>
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
                  background: i === mobileStep ? 'var(--accent)' : i < mobileStep ? 'rgba(239,107,67,0.15)' : 'var(--surface2)',
                  border: `2px solid ${i === mobileStep ? 'var(--accent)' : i < mobileStep ? 'rgba(239,107,67,0.4)' : 'var(--border)'}`,
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
                  {persons.length === 0 && <EmptyHint icon="users" text="輸入暱稱和出發地址，加入第一位參與者" />}
                  {persons.length === 1 && <EmptyHint icon="plus" text="再加入一位才能計算" />}
                  {persons.length === 0 && (
                    <button onClick={loadDemo} style={{ ...outlineBtn, width: '100%', marginTop: 10 }}>
                      ✦ 不想輸入？看一個範例
                    </button>
                  )}
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
                  {candidates.length === 0 && <EmptyHint icon="pin" text="搜尋並新增候選集合點" />}
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
                  <PrivacyNotice hasDebt={results[0]?.debtAdjusted} estimated={estimated} />
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
            <div style={{ position: 'fixed', bottom: 56, left: 0, right: 0, padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'rgba(250,244,236,0.97)', backdropFilter: 'blur(12px)', zIndex: 99 }}>
              {mobileStep === 0 && (
                <button onClick={() => persons.length >= 2 && setMobileStep(1)} disabled={persons.length < 2} style={persons.length >= 2 ? primaryBtn : disabledBtn}>
                  下一步：新增集合點 →
                </button>
              )}
              {mobileStep === 1 && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setMobileStep(0)} style={{ ...outlineBtn, padding: '13px 16px', flexShrink: 0 }}>←</button>
                  <button onClick={calculate} disabled={!canCalculate || loading} style={canCalculate && !loading ? { ...primaryBtn, flex: 1 } : { ...disabledBtn, flex: 1 }}>
                    {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />計算中…</> : '找出最公平的相聚地 ✦'}
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
              background: 'rgba(249,242,232,0.5)',
            }}>
              <section>
                <SectionLabel>參與者出發地</SectionLabel>
                <PersonSearch onAdd={addPerson} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {persons.map((p, i) => <PersonTag key={i} person={p} index={i} onRemove={() => removePerson(i)} />)}
                </div>
                {persons.length < 2 && <EmptyHint icon="users" text={persons.length === 0 ? '輸入暱稱和地址加入參與者' : '再加一位就可以計算了'} />}
                {persons.length === 0 && (
                  <button onClick={loadDemo} style={{ ...outlineBtn, width: '100%', marginTop: 10 }}>
                    ✦ 不想輸入？看一個範例
                  </button>
                )}
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
                {candidates.length === 0 && <EmptyHint icon="pin" text="搜尋並新增候選集合點" />}
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
                {loading ? <><span className="spinner" style={{ width: 14, height: 14, marginRight: 8 }} />計算中…</> : '找出最公平的相聚地 ✦'}
              </button>
              {error && <div style={{ fontSize: 12, color: 'var(--warn)', marginTop: -12 }}>{error}</div>}
            </div>

            {/* Content */}
            <div style={{ flex: 1, padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              {results ? (
                <div className="animate-fade-in">
                  <MapView candidates={candidates} rankedResults={results} center={mapCenter} />
                  <PrivacyNotice hasDebt={results[0]?.debtAdjusted} estimated={estimated} />
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
            <EmptyHint icon="users" text="還沒有群組，先建立一個吧" />
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
          background: 'rgba(250,244,236,0.97)', backdropFilter: 'blur(16px)',
          zIndex: 100, paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {[['plan', '規劃', 'map'], ['groups', '群組', 'users']].map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '10px 0', background: 'none', border: 'none',
              color: tab === t ? 'var(--accent)' : 'var(--muted)',
              fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: tab === t ? 600 : 400,
              transition: 'color 0.15s',
            }}>
              <Icon name={icon} size={20} stroke={tab === t ? 1.8 : 1.6} />
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
  const colors = ['#ef6b43', '#e0922a', '#3a9e94', '#8b7bd6', '#c2693f'];
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
      <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'var(--accent2-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--accent2)', fontFamily: 'var(--font-display)' }}>
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
      border: `1.5px solid ${active ? 'rgba(239,107,67,0.5)' : 'var(--border)'}`,
      background: active ? 'rgba(239,107,67,0.08)' : 'var(--surface2)',
      color: active ? 'var(--accent)' : 'var(--muted)',
      fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: active ? 600 : 400,
      transition: 'all 0.15s ease',
      boxShadow: active ? '0 0 12px rgba(239,107,67,0.12)' : 'none',
    }}>
      <Icon name={m.icon} size={20} stroke={active ? 1.8 : 1.6} />
      {m.label}
    </button>
  );
}

function PrivacyNotice({ hasDebt, estimated }) {
  return (
    <>
      {estimated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--accent2)', background: 'rgba(224,146,42,0.08)', border: '1px solid rgba(224,146,42,0.25)', borderRadius: 8, padding: '8px 14px', marginTop: 14 }}>
          <Icon name="target" size={13} stroke={1.6} style={{ flexShrink: 0 }} />
          估算模式：交通時間是直線距離推算，不是 Google 真實路線
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)', background: 'rgba(239,107,67,0.03)', border: '1px solid rgba(239,107,67,0.1)', borderRadius: 8, padding: '8px 14px', marginTop: 8 }}>
        <Icon name="lock" size={13} stroke={1.6} style={{ flexShrink: 0 }} />
        只顯示集合點，不顯示任何人的出發位置
        {hasDebt && <span style={{ color: 'var(--accent)' }}>· 已套用歷史補償</span>}
      </div>
    </>
  );
}

function ConvergenceHero() {
  // 等時圈母題（裝飾、非真實座標）＋ 彩色的人匯聚到「最公平的目的地」
  // 人的位置是固定裝飾排列，不反映真實出發地 → 不洩漏、無法反推
  const people = [
    { x: 60, y: 52, c: '#ef6b43' },
    { x: 224, y: 46, c: '#e0922a' },
    { x: 50, y: 128, c: '#3a9e94' },
    { x: 230, y: 134, c: '#8b7bd6' },
  ];
  return (
    <svg viewBox="0 0 280 180" width="100%" style={{ maxWidth: 430, display: 'block' }} aria-hidden="true">
      <defs>
        <radialGradient id="fmGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(239,107,67,0.28)" />
          <stop offset="100%" stopColor="rgba(239,107,67,0)" />
        </radialGradient>
      </defs>
      {/* 等時圈：由內而外的等高時間環（裝飾語言 A） */}
      {[66, 50, 34, 18].map((r, i) => (
        <circle key={r} cx="140" cy="90" r={r} fill="none" stroke="var(--accent2)" strokeOpacity={0.22 - i * 0.03} strokeWidth="1"
          style={{ animation: `fmRing 3.2s ${i * 0.35}s ease-in-out infinite` }} />
      ))}
      {/* 人 → 目的地的柔和指向（非真實路徑） */}
      {people.map((p, i) => (
        <line key={'l'+i} x1={p.x} y1={p.y} x2="140" y2="90" stroke={p.c} strokeOpacity="0.28" strokeWidth="1.2" strokeDasharray="2.5 4" strokeLinecap="round" />
      ))}
      {people.map((p, i) => (
        <g key={'o'+i}>
          <circle cx={p.x} cy={p.y} r="7" fill={p.c} fillOpacity="0.14" />
          <circle cx={p.x} cy={p.y} r="3.4" fill={p.c} />
        </g>
      ))}
      {/* 最公平的目的地 */}
      <circle cx="140" cy="90" r="30" fill="url(#fmGlow)" />
      <g transform="translate(128.5, 77) scale(0.82)" fill="rgba(239,107,67,0.16)" stroke="#ef6b43" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.4" fill="#ef6b43" stroke="none" />
      </g>
    </svg>
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
  const stepIdx = persons.length < 2 ? 0 : candidates.length === 0 ? 1 : 2;
  const copy = [
    { title: '找出對大家都公平的相聚地', sub: '加入每個人的出發地，算出車程最平均的目的地——只到行政區，不洩漏任何人的位置' },
    { title: '選幾個候選相聚地', sub: '搜尋你們可能想去的地點來比較哪裡最公平' },
    { title: '準備就緒', sub: '點左側「找出最公平的相聚地」看排名' },
  ][stepIdx];
  const steps = [
    { icon: 'users', label: '加入參與者' },
    { icon: 'map', label: '選集合點' },
    { icon: 'spark', label: '計算' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: '20px 24px' }}>
      <ConvergenceHero />
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{copy.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{copy.sub}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999,
              border: `1px solid ${i === stepIdx ? 'rgba(239,107,67,0.5)' : i < stepIdx ? 'rgba(239,107,67,0.25)' : 'var(--border)'}`,
              background: i === stepIdx ? 'rgba(239,107,67,0.08)' : 'transparent',
              color: i === stepIdx ? 'var(--accent)' : i < stepIdx ? 'var(--text2)' : 'var(--muted)',
              transition: 'all 0.2s ease',
            }}>
              <Icon name={i < stepIdx ? 'check' : s.icon} size={15} />
              <span style={{ fontSize: 12, fontWeight: i === stepIdx ? 600 : 400, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ width: 16, height: 1, background: i < stepIdx ? 'rgba(239,107,67,0.4)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>
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
      <Icon name={icon} size={15} stroke={1.6} style={{ flexShrink: 0, opacity: 0.8 }} />{text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0 -4px' }} />;
}

const primaryBtn = {
  width: '100%', padding: '13px 20px',
  background: 'linear-gradient(135deg, #ef6b43 0%, #d9531f 100%)',
  color: '#fff', border: 'none', borderRadius: 10,
  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 16px rgba(239,107,67,0.25)', transition: 'all 0.15s ease', letterSpacing: 0.3, cursor: 'pointer',
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
  border: '1.5px solid rgba(239,107,67,0.35)', borderRadius: 10,
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
