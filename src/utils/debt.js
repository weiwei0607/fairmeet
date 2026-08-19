// ─────────────────────────────────────────────
//  utils/debt.js
//  累積虧欠值系統（Debt Score）
//  記錄每人歷史犧牲，下次計算時補償
// ─────────────────────────────────────────────

// 城市平均通勤時間（分鐘），用於跨城市標準化
// 資料來源：各城市通勤調查估算值
const CITY_AVG_COMMUTE = {
  taipei:   35,
  tokyo:    48,
  osaka:    40,
  seoul:    44,
  singapore:32,
  hongkong: 38,
  default:  35,
};

// ── localStorage key ─────────────────────────
const STORAGE_KEY = 'fairmeet_groups';

// ── 讀取所有群組 ──────────────────────────────
function _isValidGroup(g) {
  return (
    g &&
    typeof g === 'object' &&
    typeof g.id === 'string' &&
    typeof g.name === 'string' &&
    Array.isArray(g.members) &&
    Array.isArray(g.history)
  );
}

export function loadGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    // 過濾掉損壞的群組資料
    const valid = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (_isValidGroup(v)) valid[k] = v;
    }
    return valid;
  } catch {
    return {};
  }
}

// ── 儲存所有群組 ──────────────────────────────
// 無痕模式 / 儲存空間已滿時 localStorage.setItem 會拋出例外。
// 這裡吞掉錯誤而不是讓呼叫端崩潰，並回傳成功與否讓 UI 可以提示使用者。
function saveGroups(groups) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    return true;
  } catch {
    return false;
  }
}

// ── 建立新群組 ────────────────────────────────
// members: [{ name }]
export function createGroup(groupName, members) {
  const groups = loadGroups();
  const id = `group_${Date.now()}`;
  groups[id] = {
    id,
    name: groupName,
    members: members.map(m => ({ name: m.name, totalDebt: 0 })),
    history: [],
    createdAt: new Date().toISOString(),
  };
  const ok = saveGroups(groups);
  return ok ? id : null;
}

// ── 記錄一次聚會結果 ─────────────────────────
// groupId: string
// meetupResult: { location, date, times: [{ name, minutes }], city }
export function recordMeetup(groupId, meetupResult) {
  const groups = loadGroups();
  const group = groups[groupId];
  if (!group) return;

  const minTime = Math.min(...meetupResult.times.map(t => t.minutes));
  const cityAvg = CITY_AVG_COMMUTE[meetupResult.city] ?? CITY_AVG_COMMUTE.default;

  // 計算每人這次的犧牲值（標準化）
  const sacrifices = meetupResult.times.map(t => ({
    name: t.name,
    rawSacrifice: t.minutes - minTime,
    normalizedSacrifice: (t.minutes - minTime) / cityAvg,
    minutes: t.minutes,
  }));

  // 累加到 totalDebt
  group.members = group.members.map(m => {
    const s = sacrifices.find(s => s.name === m.name);
    return {
      ...m,
      totalDebt: (m.totalDebt || 0) + (s?.normalizedSacrifice ?? 0),
    };
  });

  // 記錄歷史
  group.history.push({
    date: meetupResult.date || new Date().toISOString(),
    location: meetupResult.location,
    city: meetupResult.city,
    times: meetupResult.times,
    sacrifices,
  });

  saveGroups(groups);
  return group;
}

// ── 取得群組的虧欠狀態 ───────────────────────
export function getDebtSummary(groupId) {
  const groups = loadGroups();
  const group = groups[groupId];
  if (!group) return null;

  const members = [...group.members].sort((a, b) => b.totalDebt - a.totalDebt);
  const maxDebt = Math.max(...members.map(m => m.totalDebt), 0.01);

  return {
    groupName: group.name,
    historyCount: group.history.length,
    members: members.map(m => ({
      name: m.name,
      totalDebt: m.totalDebt,
      debtPercent: Math.round((m.totalDebt / maxDebt) * 100),
      // 轉回分鐘（用台北平均通勤做反標準化，方便顯示）
      debtMinutes: Math.round(m.totalDebt * CITY_AVG_COMMUTE.taipei),
    })),
  };
}

// ── 補償加權：調整候選點的公平分數 ────────────
// rankedResults: rankCandidates() 的輸出
// debtSummary: getDebtSummary() 的輸出
// compensationWeight: 0–1，預設 0.3
export function applyDebtCompensation(rankedResults, debtSummary, compensationWeight = 0.3) {
  if (!debtSummary || debtSummary.historyCount === 0) return rankedResults;

  const debtMap = {};
  debtSummary.members.forEach(m => {
    debtMap[m.name] = m.totalDebt;
  });

  const maxDebt = Math.max(...Object.values(debtMap), 0.01);

  return rankedResults
    .map(r => {
      // 對每個候選點，計算「虧欠最多的人在這個點的時間」
      // 虧欠越多的人在這個點越近 → 分數降低（越公平）
      const debtBonus = r.times.reduce((sum, t) => {
        const debt = debtMap[t.name] ?? 0;
        const normalizedDebt = debt / maxDebt; // 0–1
        // 時間越短 + 虧欠越多 → bonus 越大（越應該選這個點）
        const bonus = normalizedDebt * (1 - t.minutes / (r.maxMinutes + 1));
        return sum + bonus;
      }, 0);

      return {
        ...r,
        fairScore: r.fairScore - compensationWeight * debtBonus,
        debtAdjusted: true,
      };
    })
    .sort((a, b) => a.fairScore - b.fairScore);
}

// ── 刪除群組 ─────────────────────────────────
export function deleteGroup(groupId) {
  const groups = loadGroups();
  delete groups[groupId];
  saveGroups(groups);
}

// ── 重置某人虧欠（手動清零）─────────────────
export function resetMemberDebt(groupId, memberName) {
  const groups = loadGroups();
  const group = groups[groupId];
  if (!group) return;
  group.members = group.members.map(m =>
    m.name === memberName ? { ...m, totalDebt: 0 } : m
  );
  saveGroups(groups);
}
