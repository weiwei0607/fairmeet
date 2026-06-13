// ─────────────────────────────────────────────
//  components/ResultCard.jsx
//  集合點結果卡片
//  隱私設計：只顯示「交通分鐘數」，不顯示起點位置
// ─────────────────────────────────────────────
import { toFairnessPercent } from '../utils/fairness';

export default function ResultCard({ result, rank, maxFairScore, isTop }) {
  const percent = toFairnessPercent(result.fairScore, maxFairScore);
  const barColor = isTop ? 'var(--accent)' : rank === 1 ? 'var(--accent2)' : 'var(--muted)';

  return (
    <div style={{
      background: isTop ? 'rgba(62,240,160,0.05)' : 'var(--surface)',
      border: `1px solid ${isTop ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 12,
      padding: '18px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isTop && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--accent)', color: '#000',
          fontSize: 10, fontFamily: 'var(--font-display)',
          fontWeight: 800, padding: '4px 12px',
          borderBottomLeftRadius: 8, letterSpacing: 1,
        }}>
          最公平 ✓
        </div>
      )}

      {/* 地點名稱 + 公平分數 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-display)', minWidth: 20 }}>
          #{rank}
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text)', flex: 1 }}>
          {result.candidate.name}
        </span>
        <span style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: barColor }}>
          {percent}
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>分</span>
      </div>

      {/* 公平分數 bar */}
      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, marginBottom: 14 }}>
        <div style={{ height: '100%', width: `${percent}%`, background: barColor, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>

      {/* 統計摘要 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
        {[
          { label: '平均', value: `${result.avg} 分鐘` },
          { label: '最長', value: `${result.maxMinutes} 分鐘` },
          { label: '差距', value: `${result.spread} 分鐘` },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.label === '差距' && result.spread > 20 ? 'var(--warn)' : 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* 每人時間（只顯示暱稱+分鐘，不顯示起點）*/}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {result.times.map(t => (
          <div key={t.name} style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            color: 'var(--text)',
          }}>
            <span style={{ color: 'var(--muted)' }}>{t.name}</span>
            <span style={{ marginLeft: 6, color: t.minutes > 40 ? 'var(--warn)' : 'var(--accent)', fontWeight: 600 }}>
              {t.minutes} 分
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
