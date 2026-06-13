# 約哪裡公平 · FairMeet

多人集合點公平計算器。輸入所有人的位置，找出對所有人交通時間最公平的集合點。

## 快速開始

```bash
npm install
npm run dev
```

瀏覽器打開 http://localhost:5173

## 換成真實 Google Maps API

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案 → 啟用 **Distance Matrix API** + **Places API**
3. 建立 API key，限制來源為你的網域
4. 開啟 `src/config.js`，把第一行改成：

```js
export const GOOGLE_MAPS_API_KEY = "AIzaSy你的key";
```

存檔後重啟 `npm run dev`，右上角的「模擬模式」警告消失即表示已啟用。

## 隱私設計

- 結果頁**不顯示任何人的起點位置**，只顯示交通分鐘數
- 地圖上**只畫候選集合點**，不畫出發點方向
- 模擬模式下無任何網路請求，資料完全在本地端
- 真實 API 模式：計算完成後前端不保存座標

## 專案結構

```
src/
├── config.js          ← API key 換在這裡
├── utils/
│   ├── distance.js    ← 模擬 / Google API 切換邏輯
│   └── fairness.js    ← 公平分數演算法
└── components/
    ├── AddPerson.jsx  ← 新增參與者（選捷運站 or 輸入座標）
    ├── ResultCard.jsx ← 結果卡片
    └── MapView.jsx    ← Leaflet 地圖（免費，不需 API key）
```

## 公平分數計算

```
fairScore = 0.5 × (總時間/最大總時間) + 0.5 × (差距/最大差距)
```

- **總時間**：所有人交通時間加總，越低越好
- **差距**：最長 - 最短交通時間，越低越公平（沒人被犧牲）
- 兩個指標各佔 50%，可在 `config.js` 調整 `WEIGHT_TOTAL` / `WEIGHT_MINMAX`

## 部署（Vercel）

```bash
npm run build
# 上傳 dist/ 資料夾到 Vercel / Netlify
```

注意：API key 不要放進 git，用環境變數處理：
在 Vercel 設定 `VITE_GOOGLE_MAPS_API_KEY`，config.js 改成 `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
