# 約哪裡公平 · FairMeet

多人集合點公平計算器。輸入所有人的位置，找出對所有人交通時間最公平的集合點。

**Demo**：https://fairmeet.vercel.app

## 功能

- 輸入參與者（捷運站 / 地址搜尋 / 座標），自動產生候選集合點
- 透過 Google Maps Distance Matrix 計算真實交通時間（無 key 時自動退回模擬模式）
- 公平分數排序 + 不公平紅旗警示（標準差 / 最大差距超過閾值）
- 歷史補償：記錄每次聚會誰吃虧，下次自動優先補償
- 隱私設計：結果不顯示任何人的起點位置

## 快速開始

```bash
npm install
npm run dev
```

瀏覽器打開 http://localhost:5173

## 換成真實 Google Maps API

API key 只放在後端（Vercel Serverless Function），前端永遠看不到。

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案 → 啟用 **Distance Matrix API**
3. 建立 API key，限制來源為你的網域
4. 本地開發：複製 `.env.example` 為 `.env`，填入 `GOOGLE_MAPS_API_KEY`
5. Vercel 部署：到 Dashboard > Settings > Environment Variables 設定 `GOOGLE_MAPS_API_KEY`（可選：`ALLOWED_ORIGIN` 限制跨域來源）

沒有設定 key、Google API 失敗、或使用「看一個範例」時，會自動使用模擬模式（Haversine 直線距離估算），結果卡片上方會標示「估算模式」。

## 隱私設計

- 結果頁**不顯示任何人的起點位置**，只顯示交通分鐘數
- 地圖上**只畫候選集合點**，不畫出發點方向
- 模擬模式下無任何網路請求，資料完全在本地端
- 真實 API 模式：座標只送到自己的後端 Proxy，計算完成後前端不保存

## 專案結構

```
api/
├── distance.js        ← Vercel Serverless：Distance Matrix Proxy（key 在這層）
└── geocode.js         ← Vercel Serverless：地址轉座標 Proxy
src/
├── config.js          ← 權重、閾值等前端設定
├── utils/
│   ├── distance.js    ← 呼叫後端 Proxy，失敗時退回模擬模式
│   ├── fairness.js    ← 公平分數 + 紅旗演算法
│   ├── geocode.js     ← 地址搜尋（Nominatim + 後端 Proxy）
│   └── debt.js        ← 歷史補償（localStorage）
└── components/
    ├── AddPerson.jsx    ← 新增參與者
    ├── AddressSearch.jsx← 地址搜尋輸入框
    ├── DebtDashboard.jsx← 補償記錄面板
    ├── ResultCard.jsx   ← 結果卡片
    └── MapView.jsx      ← Leaflet 地圖（免費，不需 API key）
```

## 公平分數計算

```
fairScore = WEIGHT_TOTAL × 平均時間 + WEIGHT_MINMAX × 標準差   （越低越好）
```

- **平均時間**：所有人交通時間的平均，越低越好
- **標準差**：時間分布的離散程度，越低越公平（沒人被犧牲）
- **紅旗警示**：標準差 > 15 分鐘，或（最長 - 最短）> 30 分鐘時觸發
- 權重與閾值可在 `src/config.js` 調整（`WEIGHT_TOTAL` / `WEIGHT_MINMAX` / `UNFAIRNESS_THRESHOLD_*`）
- 演算法驗證：`node test_scoring.js`

## 部署（Vercel）

本專案已連結 Vercel（`.vercel/`），`api/` 下的 Serverless Functions 會自動部署：

```bash
npx vercel          # 預覽部署
npx vercel --prod   # 正式部署
```

注意：`GOOGLE_MAPS_API_KEY` 在 Vercel Dashboard 設定，不要放進 git。
