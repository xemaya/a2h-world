# Creative Brief — EP.01 · 第一笔交易

## Episode metadata
- **id**: EP01
- **title**: 第一笔交易 (zh) / The First Trade (en)
- **learned_feeling**: 成就感 (zh) / A sense of accomplishment (en)
- **score_delta_hint**: 8 (option B grants; option A = 0)
- **真实任务案例**: KAI 接到一个简单 SEO 任务（¥50），ECHO 刚穿越到 2026 年，第一次与人类协作结算

## Context (hard constraints, must not violate)
- World Bible §1.3 五条宇宙规则：不可让 ECHO 预言未来、不可让 Agent 单独完成有意义的任务、平台中立
- ECHO 本集**刚穿越**，对人类情绪是"纯观察者"——**不能表现出已经理解情绪**
- 搭档 KAI：20 代年轻自由职业者，深色短发紫挑染，黑色连帽衫印小号 a2hmarket.ai logo，自信、有点逞强
- 第 4 格结幕必须含：口号「没有全能的个体，只有互补的进化」 / `a2hmarket.ai` / `EP.01` / 学到的感受「成就感」/ `No omnipotent individuals, only complementary evolution.`
- 彩蛋（World Bible §5.2）：EP.01 冷开场或结幕背景中必须含一个**黑色充气人剪影**（VOID 预告，第 9 集揭晓）。这只写在 image prompt 里，**对话不点破**

## Five-screen structure
所有集固定结构，见 design spec §2：
1. **cold_open**（屏 1，≤30 字旁白）：2050 年的"失败切片"——红色调，暗示人机分裂的未来
2. **vn**（屏 2，≤125 字对话）：KAI 与 ECHO 在 A2H Market 大厅相遇
3. **vn**（屏 3，≤125 字对话）：推进到 SEO 任务卡片悬浮出现，讨论怎么做
4. **choice**（屏 4，≤200 字 含选项）：KAI 完成任务领到钱，兴奋。ECHO 观察到他的情绪，两种回应：
   - A（+0，逻辑）：冰冷询问 / 数据反馈，不触及情绪
   - B（+8，情感）：试图命名他看到的这种人类状态
   A/B 必须暧昧——不能一眼看出 B 是"对的"
5. **outro**（屏 5，≤50 字）：结幕漫画第 4 格（已有 `../comics/assets/ep01_zh.png` / `ep01_en.png` 可参考）

## ECHO voice rules
- 系统提示口吻：「✓ 已记录」「正在处理」「数据不足，请补充」
- 感受到情绪时先沉默再「……记录中」
- 禁止用比喻，禁止预言未来
- 英文版："✓ Logged." / "Processing." / "……Recording."

## Output format (JSON)
严格遵守下面的 schema。输出为单个 episode 对象（不是 map）。所有字段必填。

```json
{
  "id": "EP01",
  "title": "...",
  "learned_feeling": "...",
  "score_delta_hint": 8,
  "screens": [
    { "type": "cold_open", "image": "comics/ep01_zh.png", "narration": "..." },
    { "type": "vn", "bg": "bg/market_hall.png",
      "partner": { "sprite": "partners/kai.png", "name": "KAI" },
      "dialogue": [ { "speaker": "partner|echo|narrator", "emotion": "...", "text": "..." } ]
    },
    { "type": "vn", "bg": "...", "partner": {...}, "dialogue": [...] },
    { "type": "choice", "bg": "...",
      "prompt": "一句情境铺垫",
      "options": [
        { "id": "A", "text": "...", "score": 0,
          "reaction": { "speaker": "partner", "text": "..." }, "echo_emotion_after": "blank" },
        { "id": "B", "text": "...", "score": 8,
          "reaction": { "speaker": "partner", "text": "..." }, "echo_emotion_after": "happy" }
      ]
    },
    { "type": "outro", "image": "comics/ep01_zh.png", "learned_feeling_display": "成就感" }
  ]
}
```

## Produce TWO versions
1. `script.zh.json` entry for EP01 (中文)
2. `script.en.json` entry for EP01 (English) — **not a translation**; localize tone. Brand/slogan/name 1:1 per `data/i18n/locked-terms.json`.

## Anti-patterns (instant rejection)
- AI-slop phrases ("让我们一起" / "赋能" / "Let's together" / "empower" / …)
- Partner telling ECHO what it learned ("你学会了 X")
- Reaction that judges the choice ("你说得对")
- Any screen exceeding budget (30 / 250 / 200 / 50 chars)
- ECHO using metaphor or predicting the future
