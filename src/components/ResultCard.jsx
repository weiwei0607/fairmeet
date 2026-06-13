// ─────────────────────────────────────────────
//  components/ResultCard.jsx v2 — 視覺升級
// ─────────────────────────────────────────────
import { toFairnessPercent } from '../utils/fairness';

const RANK_COLORS = ['#3ef0a0', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c'];

export default function ResultCard({ result, rank, maxFairScore, isTop }) {
  const percent = toFairnessPercent(result.fairScore, maxFairScore);
  const rankColor = RANK_COLORS[(rank - 1) % RANK_COLORS.length];

  return (
    <div
      className="animate-fade-in"
      style={{
        background: isTop ? 'rgba(62,240,160,0.04)' : 'var(--surface)',
        border: `1px solid ${isTop ? 'rgba(62,240,160,0.28)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: isTop ? '0 0 24px rgba(62,240,160,0.08)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = isTop ? 'rgba(62,240,160,0.45)' : 'var(--border2)';
        if (isTop) e.currentTarget.style.boxShadow = '0 0 32px rgba(62,240,160,0.14)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = isTop ? 'rgba(62,240,160,0.28)' : 'var(--border)';
        e.currentTarget.style.boxShadow = isTop ? '0 0 24px rgba(62,240,160,0.08)' : 'none';
      }}
    >
      {/* Top accent line */}
      {isTop && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #3ef0a0, #1ad97a, transparent)',
        }} />
      )}

      {/* Best badge */}
      {isTop && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'linear-gradient(135deg, #3ef0a0, #1ad97a)',
          color: '#030f07', fontSize: 10, fontFamily: 'var(--font-display)',
          fontWeight: 800, padding: '5px 14px',
          borderBottomLeftRadius: 10, letterSpacing: 0.8,
        }}>最公平 ✓</div>
      )}

      {/* Rank + Name + Score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: `${rankColor}18`, border: `1.5px solid ${rankColor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, color: rankColor, fontFamily: 'var(--font-display)',
        }}>{rank}</div>

        <span style={{ flex: 1, fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', lineHeight: 1.3 }}>
          {result.candidate.name}
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-display)', color: rankColor, lineHeight: 1 }}>{percent}</span>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-display)' }}>分</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${percent}%`, borderRadius: 4,
          background: isTop ? 'linear-gradient(90deg, #3ef0a0, #1ad97a)' : `linear-gradient(90deg, ${rankColor}80, ${rankColor})`,
          animation: 'barGrow 0.7s ease both',
          boxShadow: isTop ? '0 0 8px rgba(62,240,160,0.4)' : 'none',
        }} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 14, background: 'var(--surface2)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {[
          { label: '平均', value: result.avg, warn: false },
          { label: '最長', value: result.maxMinutes, warn: false },
          { label: '差距', value: result.spread, warn: result.spread > 20 },
        ].map((s, idx) => (
          <div key={s.label} style={{ flex: 1, textAlign: 'center', padding: '10px 4px', borderRight: idx < 2 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, letterSpacing: 0.5, fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: s.warn ? 'var(--warn)' : 'var(--text)' }}>{s.value}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>分鐘</span>
            </div>
          </div>
        ))}
      </div>

      {/* Per-person times */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {result.times.map(t => {
          const isLong = t.minutes > 40;
          return (
            <div key={t.name} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface2)', border: `1px solid ${isLong ? 'rgba(251,146,60,0.3)' : 'var(--border)'}`,
              borderRadius: 8, padding: '5px 10px',
            }}>
              <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-display)', color: isLong ? 'var(--warn)' : 'var(--accent)' }}>
                {t.minutes}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)', marginLeft: 1 }}>分</span>
              </span>
            </div>
          );
        })}
      </div>

      {result.debtAdjusted && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--accent)', opacity: 0.7 }}>⚖ 已套用歷史虧欠補償</div>
      )}
    </div>
  );
}
