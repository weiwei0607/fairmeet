// ─────────────────────────────────────────────
//  components/DebtDashboard.jsx
//  累積虧欠值儀表板
// ─────────────────────────────────────────────
import { resetMemberDebt } from '../utils/debt';

export default function DebtDashboard({ summary, groupId, onUpdate }) {
  if (!summary || summary.members.length === 0) return null;

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <span style={sectionLabel}>歷史虧欠</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>共 {summary.historyCount} 次聚會</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {summary.members.map((m, i) => (
          <div key={m.name}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, flex: 1, color: 'var(--text)' }}>{m.name}</span>
              <span style={{
                fontSize: 12,
                color: m.debtMinutes > 30 ? 'var(--warn)' : m.debtMinutes > 10 ? 'var(--accent2)' : 'var(--muted)',
                fontWeight: 600,
              }}>
                {m.debtMinutes > 0 ? `+${m.debtMinutes} 分鐘虧欠` : '已平衡'}
              </span>
              {m.debtMinutes > 0 && (
                <button
                  onClick={() => {
                    resetMemberDebt(groupId, m.name);
                    onUpdate?.();
                  }}
                  title="手動清零"
                  style={clearBtn}
                >
                  清零
                </button>
              )}
            </div>
            <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${m.debtPercent}%`,
                background: m.debtMinutes > 30 ? 'var(--warn)' : m.debtMinutes > 10 ? 'var(--accent2)' : 'var(--muted)',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
        虧欠最多的人，下次計算時會自動獲得補償加權。
      </div>
    </div>
  );
}

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '18px 20px',
};
const sectionLabel = {
  fontSize: 11,
  color: 'var(--muted)',
  letterSpacing: 2,
  textTransform: 'uppercase',
  fontFamily: 'var(--font-display)',
};
const clearBtn = {
  background: 'transparent',
  border: '1px solid var(--border)',
  color: 'var(--muted)',
  fontSize: 10,
  padding: '2px 8px',
  borderRadius: 4,
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
};
