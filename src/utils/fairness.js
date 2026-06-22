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

    const variance = times.reduce((s, t) => s + Math.pow(t.minutes - avg, 2), 0) / times.length;
    const unfairnessScore = Math.sqrt(variance);

    const redFlag = unfairnessScore > 15 || spread > 30;
    const fairScore = WEIGHT_TOTAL * avg + WEIGHT_MINMAX * unfairnessScore;

    return {
      candidate,
      times,
      total,
      avg: Math.round(avg),
      spread,
      maxMinutes: maxT,
      minMinutes: minT,
      unfairnessScore,
      redFlag,
      fairScore,
    };
  });

  return results.sort((a, b) => a.fairScore - b.fairScore);
}

// 把分數轉成 0–100 的可讀百分比（100=最公平）
export function toFairnessPercent(unfairnessScore, maxFairScore) {
  return Math.max(0, Math.round((1 - unfairnessScore / 25) * 100));
}
