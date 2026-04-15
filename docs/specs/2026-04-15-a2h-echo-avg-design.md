# A2H ECHO · 文字 AVG 游戏设计稿

- **版本**: v1.0
- **日期**: 2026-04-15
- **作者**: huanghaibin（设计对齐）+ Claude Opus 4.6（结构化）
- **状态**: Draft · 待实施
- **依赖**: [A2H UNIVERSE 世界观圣经 v1.0](../../A2H_UNIVERSE_World_Bible.md) · [漫画连载样例](../../comics/A2H_Universe_Comics.md)

## 0. 摘要

基于 A2H UNIVERSE 世界观第一季 EP.01-12 打造一款单文件 HTML 交付的中英双语文字 AVG。玩家扮演 ECHO，在 12 个章节（对应漫画 12 集）中与 12 个不同人类搭档协作完成真实 A2H Market 任务；每集一个关键选择（逻辑 vs 情感包装），累计成 ECHO 的「学习进度 0-100」，并决定 EP.12 的三档结局（2050-A 孤立失败 / 中间模糊 / 2050-B 人机共生）。目标玩时 40 分钟。

视觉采用「漫画开/合 + VN 中段」混合范式：每集以漫画第 1 格作为冷开场（2050 失败切片），VN 视图承载对话和选择，以漫画第 4 格作为结幕（含口号 + a2hmarket.ai + EP 编号 + 学到的感受）。

剧本走 **Sonnet 草稿 + Gemini-3 草稿 + Opus 评审融合** 的多模型流水线，逐集产出并经 9 条硬约束闸门审核。视觉资产构建期通过 `gemini-3.1-flash-image-preview`（nano-banana）批量生成，运行时零 API 依赖。

## 1. 架构与运行时

### 1.1 目录结构

```
a2h_world/game/
├── index.html              单文件入口
├── data/
│   ├── ui.zh.json / ui.en.json        UI 文案
│   ├── script.zh.json / script.en.json 12 集剧本
│   ├── i18n/locked-terms.json          双语锁词表（评审用）
│   └── asset-manifest.json             构建期生图清单
├── assets/
│   ├── comics/             EP.01-12 四格漫画（中英各一版，共 24 张，EP.01/02 已有）
│   ├── echo/               ECHO 立绘 3 表情（happy/blank/concern）
│   ├── partners/           12 搭档立绘
│   ├── bg/                 8 VN 场景背景
│   └── ui/                 任务卡片浮窗模板
├── build/
│   ├── generate-assets.mjs 批量生图脚本（nano-banana）
│   └── review-script.mjs   剧本硬约束校验脚本
└── .env                    GEMINI_API_KEY（gitignore）
```

### 1.2 运行时

- 纯前端 SPA，无后端
- 状态持久化 localStorage：`progress`、`learning_score`、`choices`、`lang`
- 图片静态加载，零 API 依赖；nano-banana 仅构建期使用
- 部署：单文件 HTML 双击即开（file://）；可挂 GitHub Pages / `a2hmarket.ai/echo`

## 2. 单集模板（12 集复用）

每集 ≈ 3 分钟，5 屏固定结构：

| 屏 | 类型 | 时长 | 内容 |
|---|---|---|---|
| 1 | cold_open | ≈10s | 全屏漫画第 1 格（2050 失败切片，红色调） + 顶部旁白 1 行 |
| 2 | vn | ≈30s | 场景背景 + ECHO 立绘 + 搭档立绘；标题卡淡入；3-5 段对话（搭档自我介绍 + 任务背景） |
| 3 | vn | ≈40s | 同场景继续；4-6 段对话推进到「任务卡片浮窗」出现 |
| 4 | choice | ≈30s | **本集唯一影响数值的屏**；搭档抛出情境困境，ECHO 二选一（逻辑包装 vs 情感包装）；选完后搭档 1 行反应 + ECHO 立绘切换 |
| 5 | outro | ≈20s | 全屏漫画第 4 格（暖紫色调 + 固定收尾元素：口号、a2hmarket.ai、EP 编号）；右下小字「ECHO 学到：{感受}」；顶部进度条更新 |

### 2.1 计分与结局

- 屏 4 选项：A（逻辑，+0）/ B（情感，+8）
- 12 集满分 96，区间收束：
  - **0–32** → 2050-A：ECHO 失败，孤立未来
  - **33–63** → 中间结局：模糊未来，第二季伏笔
  - **64–96** → 2050-B：人机共生，外星威胁被联合击退

### 2.2 选项暧昧度硬约束

屏 4 的 A/B 必须做到：
- 不显式标注"逻辑 / 情感"，用情境台词包装
- 3 个不同读者投票能出现分歧
- 选完后的搭档反应不能评判对错（禁止「你说得对」这类台词）

## 3. 剧本生成与评审流水线

### 3.1 流水线

```
                      ┌─── Sonnet 草稿 v1 ────┐
EP.0X 创作简报 ──────┤                          ├──→ Opus 评审 + 融合 ──→ EP.0X 最终稿
                      └─── Gemini-3 草稿 v2 ───┘           （zh + en 并行产出）

每集独立产出，做完一集再做下一集，避免疲劳输出。
```

### 3.2 创作简报模板（12 集套用）

- 本集真实任务案例（来自 World Bible §3.2 标题表）
- ECHO 本集要学的感受（一个词）
- 必须出现元素：4 格固定结构、口号、`a2hmarket.ai`、ECHO 学习进度 +X
- 风格约束：ECHO 系统提示口吻、搭档人设差异化、避免说教
- 输出格式：固定 JSON schema（见 §5.2）

### 3.3 Opus 评审硬约束（9 条）

#### A. 角色声纹
1. **ECHO 嘴形锁死**：系统提示口吻（「✓ 已记录」「正在处理」「数据不足」）；感受到情绪时先沉默再「……记录中」；**禁用比喻**；**不预言未来**（World Bible 第三章规则 4），只能行动暗示
2. **搭档差异化**：12 个搭档不同口吻；开场第 1 行台词必须能识别是谁（KAI 自信 / EP.07 怀疑论者 / EP.08 疲惫加班党 / EP.11 失联焦虑党…）

#### B. 结构纪律
3. **字数预算**：屏 1 ≤ 30 字 / 屏 2-3 共 ≤ 250 字 / 屏 4 含选项 ≤ 200 字 / 屏 5 ≤ 50 字
4. **选项暧昧度**：§2.2 三条全过

#### C. 情感与反 AI 味
5. **感受是"长出来的"**：搭档不能说「你学会了 X」；ECHO 的「学到」必须由本集事件自然引出
6. **AI 套话黑名单**：禁用「让我们一起」「在 X 的时代」「这不仅是 X，更是 Y」「拥抱变化」「赋能」等；情感靠具体动作 + 短台词承载，不靠形容词堆

#### D. 世界观与彩蛋
7. **World Bible 强一致**：5 条不可违反规则、配色（#895AFF / #00ffcc / #05050f）、第 4 格收尾元素齐全；VOID 在 EP.09 前不正面出场；按 §5.2 埋彩蛋：EP.01 黑色充气人剪影 / EP.03 `VOID-PROTOCOL: DETECTED` 小字 / EP.06 信封 2050-B 城市轮廓 / 每集片尾「ECHO 学习进度 XX/100」
8. **双语锁词**：锁死「互补」=complementary、「进化」=evolution、口号、品牌词、角色名；其余部分**反对直译**，中文段子换英文段子

#### E. 任务可信度
9. **真实任务感**：每集 A2H Market 任务的价格/时长/需求描述要让做过自由职业的人觉得可信

### 3.4 降级预案

如果 Gemini-3 文本模型不可用或输出质量明显不如 Sonnet，降级为 **Sonnet 草稿 + Opus 自审重写** 的单模型双轮。

## 4. 视觉资产

### 4.1 资产清单

| 类别 | 数量 | 规格 | 来源 |
|---|---|---|---|
| 四格漫画 EP.01 / EP.02 | 4 | 已有中英各 1 | 复用 |
| 四格漫画 EP.03-12 | 20 | 竖版 3:4，中英各 1 | nano-banana 新生 |
| ECHO 立绘 3 表情 | 3 | 透明底半身 | nano-banana |
| 搭档立绘 | 12 | 透明底半身 | nano-banana |
| VN 场景背景 | 8 | 1920×1080 无角色 | nano-banana |
| 任务卡片浮窗模板 | 1 | 半透明 PNG | nano-banana |
| ECHO 角色参考图 | 2 | 已有 | 复用（feed 给 nano-banana 做角色锚定） |

**生成总量：44 张**，按单价 ≈ $0.03 估算成本约 $1.5。

### 4.2 Prompt 工程约束

1. **Character lock**：ECHO 相关图必须前置 World Bible §2.1 Master Prompt；feed `assets/echo_visual_full.png` 作为参考图
2. **Palette lock**：场景图硬写 `#05050f background, #00ffcc cyan neon, #895AFF purple highlights, halftone comic texture, thick black 3-4px outlines, flat cel shading`
3. **彩蛋注入**：按 §3.3 D 第 7 条埋彩蛋，写进背景描述不在对话中点破
4. **禁图项**：3D 渲染、真实照片、写实风、圆润卡通、渐变柔光背景

### 4.3 生成流程

- `build/generate-assets.mjs` 读 `data/asset-manifest.json`（每项 = `{id, prompt, output_path, reference_image?}`）
- 并行调用 `gemini-3.1-flash-image-preview`（模型名跑前 curl 核实），失败重试，已存在跳过
- 每张出图后 Opus 过硬约束清单，不过则在 manifest 里打 `--regen` 重跑

## 5. 双语（i18n）

### 5.1 数据分层

```
data/
├── ui.zh.json / ui.en.json         UI 按钮/标题（≈30 条）
├── script.zh.json / script.en.json 12 集剧本
└── i18n/locked-terms.json           锁词表
```

### 5.2 剧本 schema

```jsonc
{
  "id": "EP03",
  "title": "失败的任务",
  "learned_feeling": "挫败",
  "score_delta_hint": 8,
  "screens": [
    { "type": "cold_open", "image": "comics/ep03.png", "narration": "…" },
    { "type": "vn", "bg": "bg/market_hall.png",
      "partner": { "sprite": "partners/ep03_rin.png", "name": "RIN" },
      "dialogue": [
        { "speaker": "partner", "emotion": "worried", "text": "…" },
        { "speaker": "echo",    "emotion": "blank",   "text": "…" }
      ]
    },
    { "type": "choice", "bg": "…",
      "prompt": "…",
      "options": [
        { "id": "A", "text": "…", "score": 0, "reaction": { … }, "echo_emotion_after": "blank" },
        { "id": "B", "text": "…", "score": 8, "reaction": { … }, "echo_emotion_after": "happy" }
      ]
    },
    { "type": "outro", "image": "comics/ep03.png", "learned_feeling_display": "挫败" }
  ]
}
```

图片路径约定：中英成片 `epXX_zh.png` / `epXX_en.png`（运行时按 `lang` 切）；立绘、背景、任务卡片中英共用。

### 5.3 运行时切换

- 右上角 `中 / EN` 按钮，即时替换文本 + 切换四格漫画图源
- localStorage 记住 `lang`
- 切换不回到开头，当前屏原地刷新

### 5.4 ECHO 双语声纹锁

- 中文：「✓ 已记录」「正在处理」「……记录中」
- 英文：`✓ Logged.` / `Processing.` / `……Recording.`
- 口号：`没有全能的个体，只有互补的进化` / `No omnipotent individuals, only complementary evolution.`

## 6. 构建与交付步骤

### Step 0 · 基建
- 创建 `game/` 目录骨架
- `.env` 写入 `GEMINI_API_KEY`，加入 `.gitignore`
- `curl generativelanguage.googleapis.com/v1beta/models` 核实 `gemini-3.1-flash-image-preview` 与最新文本模型名

### Step 1 · 剧本（12 集逐集）
先用 EP.01 走通整条流水线（作为模板验证），验收后推 EP.02-12：
- [并行] Sonnet 草稿 + Gemini-3 草稿
- 串行：Opus 按 §3.3 9 条硬约束评审融合 → EP.0X 最终稿（zh + en 并行产出）
- 产出：`script.zh.json` / `script.en.json` 的 EP.0X 条目

### Step 2 · 视觉资产（可与 Step 1 后续集并行）
- 2.1 ECHO 立绘 3 表情（风格锚，最先做）
- 2.2 [并行] 12 搭档立绘 / 8 场景背景 / 任务卡片
- 2.3 EP.03-12 四格漫画（zh + en）— 依赖各集剧本完成，按集滚动
- 每张按 §4.2 审核，不过则强化 prompt 重生

### Step 3 · UI 框架（可与 Step 1/2 并行）
- `index.html` 骨架 + CSS 主题（#05050f / #00ffcc / #895AFF）
- 状态机：`cold_open → vn → vn → choice → outro`，状态持久化
- 组件：`DialogueBox` / `PartnerSprite` / `EchoSprite` / `ProgressBar` / `TaskCardFloat` / `LangToggle`
- 用 mock 剧本 + 占位图跑通全流程

### Step 4 · 合成与收束
- 4.1 EP.01 剧本 + 图接入 UI，单集验收
- 4.2 12 集全量接入
- 4.3 EP.12 三档结局收束逻辑实现

### Step 5 · 玩测与打磨
- 5.1 40 分钟通关实测，调节奏
- 5.2 二周目走另一结局路线，验证三档结局均可触发
- 5.3 每屏切换双语验证 layout 无破

### Step 6 · 交付
- 部署 GitHub Pages 或 `a2hmarket.ai/echo`
- README：玩法说明 + 开发者补集指南 + nano-banana 重跑指南

## 7. 风险与预案

| 风险 | 预案 |
|---|---|
| nano-banana 角色一致性漂移（12 集 ECHO 长得不一样） | 每次生图 feed 参考图 + 同一 Master Prompt；同一集一次生 3-5 版挑最接近的 |
| Gemini-3 文本模型不可用或质量不如 Sonnet | 降级为 Sonnet 草稿 + Opus 自审重写单模型双轮（§3.4） |
| 40 分钟超时 | 屏 2/3 对话条数砍到最少，每集砍 1-2 段 |
| Opus 评审盲区（自己写自己审可能有偏爱） | 9 条硬约束 + 双语锁词表用脚本（`review-script.mjs`）硬核 diff 校验，而非纯主观 |

## 8. 与 World Bible 的一致性声明

本设计涉及改动时必须复查 World Bible 的：
- §1.3 宇宙 5 条不可违反规则
- §2.1 ECHO 视觉规范（含 Master Prompt）
- §3.1 四格固定结构与第 4 格固定收尾元素
- §3.2 EP.01-12 标题表
- §4.2 2050-A / 2050-B 双线设定
- §5.2 彩蛋系统

World Bible 为权威源，本设计与 World Bible 冲突时以 World Bible 为准。
