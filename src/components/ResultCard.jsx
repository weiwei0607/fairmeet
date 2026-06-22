// ─────────────────────────────────────────────
//  components/ResultCard.jsx — 「等時圈 × 相聚」結果卡
//  最公平的相聚地（行政區層級）＋ 公平度 ＋ 可收合個人時間
// ─────────────────────────────────────────────
import { useState } from 'react';
import { toFairnessPercent } from '../utils/fairness';

const RANK_COLORS = ['#ef6b43', '#e0922a', '#3a9e94', '#8b7bd6', '#c2693f'];

export default function ResultCard({ result, rank, maxFairScore, isTop }) {
  const [showTimes, setShowTimes] = useState(false);
  const percent = toFairnessPercent(result.unfairnessScore, maxFairScore);
  const rankColor = RANK_COLORS[(rank - 1) % RANK_COLORS.length];
  const area = result.candidate.district || result.candidate.name;

  // ── 冠軍卡：行政區當主角 ──
  if (isTop) {
    return (
      <div className="animate-fade-in" style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)',
        padding: '4px', boxShadow: '0 10px 30px rgba(239,107,67,0.12)',
      }}>
        <div style={{
          borderRadius: 13, padding: '22px 22px 18px',
          background: 'radial-gradient(120% 90% at 50% 0%, rgba(239,107,67,0.10), rgba(252,246,238,0) 60%)',
        }}>
          {/* 等時圈裝飾母題（純裝飾） */}
          <svg viewBox="0 0 200 80" width="100%" style={{ position: 'absolute', top: 0, left: 0, opacity: 0.5, pointerEvents: 'none' }} aria-hidden="true">
            {[58, 42, 26].map(r => <circle key={r} cx="100" cy="6" r={r} fill="none" stroke="var(--accent2)" strokeOpacity="0.18" strokeWidth="1" />)}
          </svg>

          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{ fontSize: 10, letterSpacing: 4, color: 'var(--muted)', fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>最 公 平 的 相 聚 地</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 34, color: 'var(--text)', lineHeight: 1.1 }}>{area}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '5px 14px', borderRadius: 999, background: 'var(--accent)', color: '#fff' }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700 }}>公平度 {percent}%</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 12 }}>
              對 {result.times.length} 人最公平 · 平均車程 {result.avg} 分鐘 · 差距 {result.spread} 分
            </div>
          </div>

          {/* 可收合的個人時間（隱私：預設收起） */}
          <button onClick={() => setShowTimes(v => !v)} style={{
            margin: '16px auto 0', display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-body)',
          }}>
            {showTimes ? '隱藏' : '顯示'}個人車程
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showTimes ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
          </button>

          {showTimes && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {result.times.map(t => {
                const w = Math.min(100, (t.minutes / Math.max(result.maxMinutes, 1)) * 100);
                return (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text2)', width: 48, flexShrink: 0, fontFamily: 'var(--font-display)' }}>{t.name}</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${w}%`, background: 'var(--accent)', borderRadius: 3, animation: 'barGrow 0.6s ease both' }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text2)', width: 40, textAlign: 'right', fontFamily: 'var(--font-display)' }}>{t.minutes} 分</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3 M6 11h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" /></svg>
            只到行政區層級 · 不顯示也無法反推任何人的確切位置
          </div>
        </div>
      </div>
    );
  }

  // ── 其他名次：精簡比較列 ──
  return (
    <div className="animate-fade-in" style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '14px 16px',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
      <div style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: `${rankColor}1e`, border: `1.5px solid ${rankColor}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: rankColor, fontFamily: 'var(--font-display)',
      }}>{rank}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{area}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>平均 {result.avg} 分 · 差距 {result.spread} 分</div>
      </div>
      <div style={{ width: 70, flexShrink: 0 }}>
        <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${percent}%`, background: rankColor, borderRadius: 3, animation: 'barGrow 0.7s ease both' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, width: 44, justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-display)', color: rankColor, lineHeight: 1 }}>{percent}</span>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>%</span>
      </div>
    </div>
  );
}
