# World Cup Prediction System v2.0 — Architecture Report

## Phase 1: MVP (v1.0) — COMPLETED
- ELO Rating System (1998-2022, 384 matches)
- FIFA Rankings integration
- Backtest: 46.9% accuracy

## Phase 2: Mid-Field Deep Features (v2.0)

### 2.1 Data Expansion Engine ✅
**Problem:** World Cup正赛样本量太少（每4年64场）
**Solution:** 引入非世界杯赛事数据

| 数据源 | 赛事 | 状态 |
|--------|------|:---:|
| openfootball/worldcup.json | 世界杯 1998-2026 | ✓ |
| openfootball/euro.json | 欧洲杯 | 待接入 |
| Football-Data.co.uk | 预选赛 | 待接入 |
| API-Football | 全部赛事 | 待接入 |

**Module:** `src/features/DataExpansionEngine.ts`

### 2.2 Context & Weather Features ✅
**Impact:** 高海拔/炎热/大雨显著影响比赛结果

| 因素 | 影响 | 修正 |
|------|------|:---:|
| 墨西哥城 2240m | 高海拔球队优势 | +8% 爆冷 |
| 南方城市 34℃ | 热带球队优势 | +5% 平局 |
| 大雨草皮积水 | 传控削弱 | +8% 平局/爆冷 |

**Module:** `src/features/ContextFeatures.ts`
**Venues:** 8 个 2026 世界杯场馆 (含海拔/气候/草坪数据)

### 2.3 Player Dynamics ✅
**Impact:** 核心球员伤病/转会影响巨大

| 因素 | 系数 | 说明 |
|------|:---:|------|
| 转会扰动 | 0-0.4 | 12个月内转会，越近扰动越大 |
| 伤病恢复 | 0.6-1.0 | 大伤初愈(<1月)折损40% |
| 疲劳度 | 0-1 | 赛季>3000分钟+年龄>30 |
| 核心球员权重 | 0.5+ | 核心伤病影响全队 |

**Module:** `src/features/PlayerDynamics.ts`

### 2.4 Tactical Matchup Matrix ✅
**Impact:** "纸面身价"不等于实际胜率

| 克制关系 | 胜率修正 | 平局修正 | 爆冷修正 |
|---------|:---:|:---:|:---:|
| 传控 vs 大巴 | -8% | +10% | +8% |
| 逼抢 vs 大巴 | -10% | +12% | +10% |
| 反击 vs 传控 | +5% | +5% | +6% |
| 反击 vs 逼抢 | +6% | +5% | +5% |

**Module:** `src/features/TacticalMatchup.ts`
**Teams:** 30+ 国家队战术标签

## Phase 3: Black Swan Defense (v2.0)

### 3.1 Referee Profile Engine ✅
**Impact:** 裁判是场上唯一合法改变规则走向的变量

| 因素 | 影响 |
|------|------|
| 场均黄牌 | 粗犷球队遇严厉裁判: 减员风险 |
| 点球率 | 攻方获益 |
| 主场哨 | 0-5% 偏向 |

**Module:** `src/features/RefereeEngine.ts`

### 3.2 Sentiment & Motivation ✅
**Impact:** 更衣室氛围影响比赛

| 场景 | 战意修正 |
|------|:---:|
| 提前出线轮换 | 胜率 -10% |
| 已被淘汰 | 胜率 -15% |
| 必须赢球 | 胜率 +5% |
| 打平携手出线 | 平局 +15% |

**Module:** `src/features/SentimentEngine.ts`
**Interface:** NLP情感分析接口预留

### 3.3 Odds & Market Volume ✅
**Impact:** 博彩公司精算师有内幕情报

| 信号 | 含义 |
|------|------|
| 赔率漂移 >15% | 隐藏利空 |
| 反向资金流 | 市场知情者下注 |
| 临场异常 | 阵容/伤病突发 |

**Module:** `src/features/OddsEngine.ts`

## System Architecture

```
┌─────────────────────────────────────────────────┐
│              Prediction Engine v2.0              │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │         Feature Aggregator                 │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │  │
│  │  │ ELO  │ │FIFA  │ │Tactic│ │ Context  │  │  │
│  │  │Rating│ │Rank  │ │Match │ │ Weather  │  │  │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘  │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │  │
│  │  │Player│ │Referee│ │Sentim│ │  Odds   │  │  │
│  │  │Dynam.│ │Profile│ │ent   │ │ Market  │  │  │
│  │  └──────┘ └──────┘ └──────┘ └──────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌────────────────────────────────────────────┐  │
│  │         Weighted Ensemble Model            │  │
│  │  Phase 1: ELO+FIFA (50+35+15)              │  │
│  │  Phase 2: +Tactical+Context+Player         │  │
│  │  Phase 3: +Referee+Sentiment+Odds          │  │
│  └────────────────────────────────────────────┘  │
│                      ↓                           │
│  ┌────────────────────────────────────────────┐  │
│  │         Confidence Calculator              │  │
│  │  signal_strength × data_completeness       │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Feature Weights (v2.0)

| Feature | Weight | Phase | Status |
|---------|:---:|:---:|:---:|
| ELO Rating | 0.25 | 1 | ✅ |
| FIFA Ranking | 0.20 | 1 | ✅ |
| Tactical Matchup | 0.15 | 2 | ✅ |
| Context & Weather | 0.10 | 2 | ✅ |
| Player Dynamics | 0.10 | 2 | ✅ |
| Referee Profile | 0.05 | 3 | ✅ |
| Sentiment & Motivation | 0.05 | 3 | ✅ |
| Odds & Market | 0.10 | 3 | ✅ |

## Data Sources

| Source | Type | Cost | Coverage | Status |
|--------|------|------|---------|:---:|
| openfootball | JSON | Free | 1930-2026 | ✅ |
| FIFA Rankings | Web | Free | All teams | ✅ |
| API-Football | REST | Free/Paid | Global | 待接入 |
| Odds Portal | Scraper | Free | Live odds | 待接入 |
| Twitter/News | NLP | Free | Sentiment | 待接入 |

## Module Inventory

| Module | File | Lines | Status |
|--------|------|:---:|:---:|
| DataExpansionEngine | src/features/DataExpansionEngine.ts | ~120 | ✅ |
| ContextFeatures | src/features/ContextFeatures.ts | ~160 | ✅ |
| PlayerDynamics | src/features/PlayerDynamics.ts | ~120 | ✅ |
| TacticalMatchup | src/features/TacticalMatchup.ts | ~170 | ✅ |
| RefereeEngine | src/features/RefereeEngine.ts | ~50 | ✅ |
| SentimentEngine | src/features/SentimentEngine.ts | ~80 | ✅ |
| OddsEngine | src/features/OddsEngine.ts | ~80 | ✅ |
| predict.js | world-cup-prediction/predict.js | ~100 | ✅ |

## Next Steps

1. **Data Acquisition**: 接入 API-Football 获取预选赛/欧洲杯数据
2. **Feature Integration**: 将 7 个模块接入 predict.js v2.0
3. **Backtest**: 用 2018-2022 数据验证 v2.0 模型
4. **Live Testing**: 2026 世界杯实时预测
5. **Odds Integration**: 接入实时赔率数据

## Risk: Data Gap

| 缺失 | 影响 | 替代方案 |
|------|------|---------|
| 球员实时伤病 | 预测精度 -10% | 赛前人工更新 |
| 实时赔率 | 无法检测异常 | 24h 缓存 |
| NLP 情感 | 战意评估不完整 | 手动标注 |
| 预选赛历史 | 训练数据不足 | 使用 FIFA 排名替代 |
