// ─────────────────────────────────────────────
//  utils/fairness.js
//  公平分數計算核心邏輯
// ─────────────────────────────────────────────
import { WEIGHT_TOTAL, WEIGHT_MINMAX } from '../config';

// matrix[i][j] = person i 到 candidate j 的分鐘數
// 回傳每個候選點的分析結果，依公平分數排序（低=好）
export function rankCandidates(candidates, persons, matrix) {
  const results = candidates.map((candidate, j) => {
    const times = persons.map((p, i) => ({
      name: p.name,
      minutes: matrix[i][j] ?? 999,
    }));

    const total = times.reduce((s, t) => s + t.minutes, 0);
    const avg = total / times.length;
    const maxT = Math.max(...times.map(t => t.minutes));
    const minT = Math.min(...times.map(t => t.minutes));
    const spread = maxT - minT; // 最大差距，越小越公平

    return {
      candidate,
      times,
      total,
      avg: Math.round(avg),
      spread,
      maxMinutes: maxT,
      minMinutes: minT,
    };
  });

  // 正規化後計算公平分數（0=最公平）
  const maxTotal = Math.max(...results.map(r => r.total));
  const maxSpread = Math.max(...results.map(r => r.spread)) || 1;

  return results
    .map(r => ({
      ...r,
      fairScore:
        WEIGHT_TOTAL * (r.total / maxTotal) +
        WEIGHT_MINMAX * (r.spread / maxSpread),
    }))
    .sort((a, b) => a.fairScore - b.fairScore);
}

// 把分數轉成 0–100 的可讀百分比（100=最公平）
export function toFairnessPercent(fairScore, maxFairScore) {
  if (maxFairScore === 0) return 100;
  return Math.round((1 - fairScore / maxFairScore) * 100);
}
