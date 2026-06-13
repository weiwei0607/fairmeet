// ─────────────────────────────────────────────
//  FairMeet · config.js
//  前端設定（API key 已移到後端 Proxy，前端看不到）
// ─────────────────────────────────────────────

// 台北市預設中心（地圖初始位置）
export const DEFAULT_CENTER = { lat: 25.0330, lng: 121.5654 };

// 候選集合點最多幾個（控制 API 費用）
export const MAX_CANDIDATES = 5;

// 公平分數權重（0–1，兩者加總=1）
// fairness_score = WEIGHT_TOTAL * 總時間分數 + WEIGHT_MINMAX * 差距分數
export const WEIGHT_TOTAL = 0.5;
export const WEIGHT_MINMAX = 0.5;
