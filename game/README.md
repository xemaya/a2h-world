# A2H Universe — Visual Novel Game

A2H Universe 互动视觉小说。基于 A2H Market 世界观，讲述 Agent ECHO 从 2050 年穿越回 2026 年，与人类搭档协作完成任务、逐步理解情感的故事。

**Live:** https://xemaya.github.io/a2h-world/

---

## Quick Start

```bash
cp .env.example .env   # 填入 GEMINI_API_KEY
npm install
npm run dev            # http://localhost:8080
npm test               # 31 tests
```

---

## 项目结构

```
game/
├── index.html                 ← 入口页面
├── src/
│   ├── main.js                ← 启动、事件绑定、状态→DOM 同步
│   ├── state.js               ← 纯状态机（gameMode、screenIdx、lineIdx）
│   ├── i18n.js                ← 中英文切换
│   ├── storage.js             ← localStorage 存档
│   └── ui/
│       ├── screens.js         ← 场景渲染（VN 对话、选择、outro）
│       └── menu.js            ← 主菜单、章节选择、未完待续
├── styles/main.css            ← 赛博朋克主题 CSS
├── data/
│   ├── script.zh.json         ← 中文剧本（所有 episode）
│   ├── script.en.json         ← 英文剧本
│   ├── ui.zh.json / ui.en.json← UI 文案
│   ├── characters.json        ← 角色注册表（视觉描述、情绪、sprite 路径）
│   └── asset-manifest.json    ← 素材生成清单（旧版，新流程用 characters.json）
├── assets/
│   ├── echo/                  ← ECHO 情绪 sprite（blank/concern/happy）
│   ├── partners/              ← 搭档 sprite（kai.png）
│   ├── bg/                    ← 场景背景图
│   ├── comics/                ← 漫画封面（ep01_zh/en.png）
│   └── ui/                    ← UI 素材
├── build/
│   ├── build-episode.mjs      ← 一键构建编排器
│   ├── steps/                 ← 构建步骤模块
│   │   ├── gen-script.mjs     ← 大纲→剧本 JSON（Gemini 文本 API）
│   │   ├── scan-assets.mjs    ← 扫描剧本，找缺失素材
│   │   ├── gen-assets.mjs     ← 生成缺失 sprite/背景（Gemini 图像 API）
│   │   └── validate.mjs       ← 全量校验
│   ├── lib/
│   │   ├── env.mjs            ← .env 加载器
│   │   └── gemini.mjs         ← Gemini API 封装（文本+图像）
│   ├── briefs/                ← 剧情大纲（每集一个 .md）
│   └── cache/                 ← 构建中间产物（gitignore）
└── tests/                     ← vitest 测试
```

---

## 核心工作流：一键构建新集

### 1. 写大纲

在 `build/briefs/` 下新建 markdown 文件：

```markdown
# EP.03 ECHO 学会：信任

## 设定
- 场景：A2H Market 交易大厅
- 任务：xxx
- 搭档：KAI

## 剧情大纲
1. 【story_intro 开篇】2050 年的反例……
2. 【cold_open 旁白】一句话描述 2050 场景
3. 【VN场景1】……
4. 【VN场景2】……
5. 【选择】……
   - A: 效率/逻辑选项（+0 分）
   - B: 情感/协作选项（+8 分）
6. 【outro 结尾】ECHO 学到的感受

## ECHO 学到的感受
信任 / Trust
```

**不需要写**：sprite 路径、情绪标签、背景图描述、英文翻译 — 全部自动生成。

### 2. 一键构建

```bash
npm run build:episode -- --outline=build/briefs/ep03-brief.md
```

自动执行 4 个步骤：

| 步骤 | 说明 | 产出 |
|------|------|------|
| gen-script | Gemini 生成中文剧本 + 翻译英文 | script.zh/en.json |
| scan-assets | 扫描剧本，找缺失素材 | cache/asset-needs.json |
| gen-assets | 生成缺失的 sprite/背景图 | assets/**/*.png |
| validate | 校验完整性和一致性 | pass/fail |

### 3. 推送上线

```bash
git add -A && git commit -m "feat: add EP.03"
git push origin main
```

GitHub Actions 自动部署到 Pages。

---

## 单步执行和调试

```bash
# 只跑某一步
npm run build:episode -- --step=gen-script --outline=build/briefs/ep03-brief.md
npm run build:episode -- --step=scan-assets
npm run build:episode -- --step=gen-assets
npm run build:episode -- --step=validate

# 从失败处恢复（checkpoint 自动记录）
npm run build:episode -- --resume

# 只重新生成某个素材
npm run build:episode -- --step=gen-assets --only=echo_surprise

# 单独跑验证
npm run validate

# 剧本质量审查（9 条硬约束）
npm run review:script
```

---

## 素材生成

### ECHO Sprite 生成（关键）

**必须传参考图**，纯文本 prompt 效果很差：

```javascript
// 正确做法：character_lock + style + 表情描述 + 参考图
parts = [
  { text: characters.echo.character_lock },
  { text: characters.echo.style },
  { text: '表情描述...' },
  { inline_data: { mime_type: 'image/png', data: refImageBase64 } }
];
```

参考图位置：`../assets/echo_visual_full.png`（仓库根目录的 assets，不是 game/assets）

### 背景图生成

自动从剧本中推导场景描述，调 Gemini 图像 API 生成。不需要参考图。

### 手动生成素材

```bash
# 旧版批量生成（基于 asset-manifest.json）
npm run gen:assets
npm run gen:assets -- --only=echo_happy --overwrite
```

---

## 添加新角色

编辑 `data/characters.json`：

```json
{
  "new_character": {
    "name": "角色名",
    "speaker_id": "partner",
    "sprite_dir": "assets/partners",
    "sprite_pattern": "new_character.png",
    "emotions": ["default"],
    "character_lock": "角色外观的详细文字描述..."
  }
}
```

在大纲中引用 `搭档：NEW_CHARACTER`，pipeline 会自动处理 sprite 路径解析。

---

## 游戏引擎

### 状态机

```
gameMode: 'menu' | 'chapter-select' | 'playing' | 'tbc'
```

- **menu**：主菜单（新游戏 / 继续 / 章节选择 / 语言切换）
- **playing**：游戏中，按 screenIdx + lineIdx 推进
- **tbc**：最后一集结束后的「未完待续」页面
- **chapter-select**：章节选择列表

### 屏幕类型

| type | 说明 | 数据 |
|------|------|------|
| story_intro | 开篇文字滚屏 + 章节标题 | content[] |
| cold_open | 2050 年场景 + 旁白 | image, narration |
| vn | 视觉小说对话 | bg, partner, dialogue[] |
| choice | 选择分支（A/B） | prompt, options[] |
| outro | 结尾 + 学到的感受 | image, learned_feeling_display |

### 集间导航

- EP 结束 → 自动进入下一集
- 最后一集结束 → 显示「未完待续」
- 章节选择可以跳到任意已有的集

### Sprite 动态解析

引擎从 `characters.json` 读取 sprite 路径模式，不再硬编码：

```javascript
// characters.json 定义
"sprite_pattern": "echo_{emotion}.png"

// 运行时解析
resolveSpritePath(characters, 'echo', 'happy')
// → "assets/echo/echo_happy.png"
```

---

## 世界观约束

创作时必须遵守（build pipeline 的 gen-script 会自动注入这些规则）：

1. Agent 单独完成的任务会失去人类认可的价值
2. 人类必须选择 Agent 搭档
3. 时间穿越只发生一次（ECHO 唯一）
4. ECHO 不能直接预言未来，只能引导/示范
5. A2H Market 平台中立，不站队，**始终正面表达**
6. 品牌口号「没有全能的个体，只有互补的进化」每集 outro 必须出现

详见 `../A2H_UNIVERSE_World_Bible.md`

---

## 技术栈

- **前端**：纯 HTML/CSS/JS，无框架，ESM 模块
- **构建**：Node.js ESM 脚本
- **AI**：Google Gemini API（文本生成 + 图像生成）
- **测试**：vitest
- **部署**：GitHub Pages（push main 自动触发）
- **中英文**：运行时 i18n，一键切换
