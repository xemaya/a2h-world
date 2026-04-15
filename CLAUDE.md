# CLAUDE.md — A2H World

A2H UNIVERSE 创作工作目录。所有围绕 A2H Market 的漫画、视频、故事、角色创作都从这里出发。

## 世界观圣经

**[A2H_UNIVERSE_World_Bible.md](./A2H_UNIVERSE_World_Bible.md)** — 唯一权威设定文档（v1.0）

任何创作动作开始前，必须先读这份文档。源文档在飞书：
`https://hcni0huxvv2y.feishu.cn/docx/OV3LdfSLhoNzfBxHG4QcvYJ7nKg`（最新版以飞书为准）。

### 核心要点速查

- **宇宙时间线**：2026 Agent 元年 → 2050 外星舰队抵达，ECHO 被发射回 2026 阻止裂痕
- **核心矛盾**：当 Agent 可独立完成任务时，人类还有什么价值？立场是「共生才是完整的进化」
- **不可违反规则**（5 条）：
  1. Agent 单独完成的任务会失去人类认可的价值
  2. 人类必须选择 Agent 搭档
  3. 时间穿越只发生一次（ECHO 唯一）
  4. ECHO 不能直接预言未来，只能引导/示范
  5. A2H Market 平台中立，不站队
- **品牌口号**：「没有全能的个体，只有互补的进化」——每集第 4 格必须出现，不可断句、不可由反派 VOID 说出

### ECHO 视觉规范（生图锁定标准）

视觉参考图：
- [assets/echo_visual_full.png](./assets/echo_visual_full.png)
- [assets/echo_visual_compact.png](./assets/echo_visual_compact.png)

硬性约束（生图前必查 World Bible §2.1）：
- 主色 `#895AFF` 紫色，**禁用**旧色号 `#7F77DD`
- 头顶 3 根天线 / 胸口 A2H 青绿色（`#00ffcc`）徽章 / 背景必须出现 `a2hmarket.ai` 紫色霓虹招牌
- 禁止：画鼻子、省略天线、改变主色、去掉徽章、用复杂渐变背景替代赛博朋克街道
- Master Prompt 在 World Bible §2.1 末尾，生图时整段复用

## 漫画样例（创作参考）

**[comics/A2H_Universe_Comics.md](./comics/A2H_Universe_Comics.md)** — 已发布漫画连载

源文档：`https://hcni0huxvv2y.feishu.cn/wiki/WTETwTK68iM4eEkRewvcEvBlnsg`

样例覆盖：
- **EP.01 一封从 2050 发来的求救信** — ECHO 穿越降临 2026，遇到第一个搭档
- **EP.02 ECHO 学会：团队分工** — 与 KAI 协作完成限时任务，主题「互补 > 单干」

每集结构：完整生图 Prompt（4 格、配色、对话、底部口号）+ 中英成片对照。新集创作时套用此模板：
1. 第一格（红色调）：2050 年人机对立的反例
2. 第二格（深紫色调）：当前任务/挑战的设定
3. 第三格（青绿色调）：协作过程
4. 第四格（暖紫色调）：结果 + ECHO 学到一种新感受 + 底部「没有全能的个体，只有互补的进化」+「a2hmarket.ai」

## 目录约定

```
a2h_world/
├── CLAUDE.md                       ← 本文件（索引 + 速查）
├── A2H_UNIVERSE_World_Bible.md     ← 世界观圣经（权威）
├── assets/                         ← ECHO 视觉规范图
└── comics/
    ├── A2H_Universe_Comics.md      ← 漫画连载（含每集 Prompt + 成片）
    └── assets/                     ← 角色参考图 + 各集中英成片
```
