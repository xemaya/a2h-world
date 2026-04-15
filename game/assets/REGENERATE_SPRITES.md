# Sprite & Background 重新生成指南

## 紧急问题
当前sprite文件虽然扩展名是.png，但实际是JPEG格式，棋盘格背景已烤入图片数据。
**必须重新生成所有sprite和部分背景图。**

---

## 1. ECHO Sprite 生成（3个表情）

### 通用技术要求
```
Format: PNG with alpha channel (RGBA)
Size: 1400x800px
Background: COMPLETELY TRANSPARENT (no checkerboard, no solid color)
Style: Flat 2D comic illustration, cel shading
Export: PNG-24 with transparency
```

### ECHO Master Prompt (基于World Bible §2.1)

**Base Character Design:**
```
Reference character style: flat 2D comic illustration, NOT 3D, NOT rounded cartoon

ECHO character — follow exactly:
- body shape: flat trapezoid body, wide at top narrow at bottom, NO neck, head merged with body
- head: same trapezoid shape, seamlessly merged with body, NOT a separate circle
- antennae: THREE short thick antennae sticking upward from top of head, bold and blocky
- eyes: TWO separate white oval shapes, NO pupils, NO eyebrows
- mouth: [VARIES BY EMOTION - see below]
- arms: short stubby arms on sides, simple blocky shape, ending in 3-finger hands
- legs: short legs, rounded feet
- body color: solid #895AFF purple (#895AFF hex exactly), flat color with halftone dot texture
- outline: thick black ink outline 3-4px, comic book style
- chest badge: circular cyan (#00ffcc) glowing outline with "A2H" text inside
- NO neck, NO separate head, NO pupils, NO nose, NO ears, NO complex gradients

Style: flat cel shading, 2D comic panel aesthetic, manga/anime influenced
Background: COMPLETELY TRANSPARENT BACKGROUND (alpha channel, no checkerboard pattern)
Lighting: soft purple rim light on edges, subtle cyan glow from chest badge
```

### 三个表情变体

#### 1. echo_blank.png (发呆/中立)
```
[BASE PROMPT ABOVE] +

Emotion: blank/neutral
- eyes: TWO white ovals (○○), simple and empty
- mouth: NONE (no mouth visible)
- pose: standing upright, arms at sides relaxed
- overall mood: observing, processing, neutral presence

CRITICAL: transparent background, PNG RGBA format
```

#### 2. echo_concern.png (困惑/担忧)
```
[BASE PROMPT ABOVE] +

Emotion: concerned/worried
- eyes: TWO white ovals squinting (●●), narrowed
- mouth: small inverted arc (frown), thin white line
- pose: one arm raised to chin in thinking gesture
- overall mood: confused, uncertain, processing difficulty

CRITICAL: transparent background, PNG RGBA format
```

#### 3. echo_happy.png (开心/欢快)
```
[BASE PROMPT ABOVE] +

Emotion: happy/excited
- eyes: TWO white ovals wide open (○○)
- mouth: wide white arc smile, thick and bold
- pose: both arms raised in celebration, dynamic stance
- overall mood: joyful, accomplished, energetic
- optional: small sparkle effects near head (but background still transparent)

CRITICAL: transparent background, PNG RGBA format
```

---

## 2. KAI Sprite 生成

### Technical Requirements
```
Format: PNG with alpha channel (RGBA)
Size: 1400x800px  
Background: COMPLETELY TRANSPARENT
Style: Cyberpunk illustration, semi-realistic anime style
```

### KAI Character Prompt

```
Character: KAI, 25-year-old Asian male entrepreneur

Physical appearance:
- face: young Asian male, early 20s, sharp features, determined expression
- hair: short dark hair with purple highlights, slightly messy/windswept
- eyes: dark eyes with cyan light reflection, focused gaze
- skin tone: light skin with purple/cyan color grading for cyberpunk mood

Clothing:
- black oversized hoodie with cyan neon edge lighting
- visible "a2hmarket.ai" text logo on chest in cyan neon glow
- hood down, hoodie slightly wrinkled/worn
- hands in hoodie pocket or one hand visible
- slim fit dark pants (partially visible)

Lighting & Style:
- cyberpunk color grading: purple and cyan tones
- rim lighting: cyan neon glow on edges of clothing and hair
- face lighting: soft purple ambient with cyan highlights
- style: semi-realistic anime illustration, detailed but clean
- line art: visible black outlines, comic book influence
- shading: cel shading mixed with soft gradients

Pose: 
- standing confidently, slight lean forward
- casual but alert posture
- one hand in pocket or arms crossed
- full body visible from head to mid-thigh

Background: COMPLETELY TRANSPARENT (PNG alpha channel, no checkerboard)
Format: PNG-24 with transparency
Resolution: 1400x800px

CRITICAL: Export as PNG with alpha transparency, NO background elements, NO checkerboard pattern
```

---

## 3. 新增场景背景图

当前只有market_hall.png，需要增加2-3个场景提供视觉多样性。

### 3.1 street_alley.png (街道小巷 - KAI出场场景)
```
Scene: Cyberpunk back alley at night

Environment:
- narrow alley between tall buildings
- wet pavement reflecting neon lights
- scattered trash and crates for atmosphere
- steam vents creating atmospheric fog
- distant city lights in background

Lighting:
- dominant purple and cyan neon signs
- one visible "a2hmarket.ai" neon sign on left wall
- scattered holographic advertisements
- moody blue/purple ambient lighting
- shadows creating depth

Style: 
- painted background, not photorealistic
- cyberpunk aesthetic, Blade Runner influenced  
- atmospheric, slightly grungy
- focus on mood over detail

Format: PNG, 1920x1080px, optimized for web
Color palette: dark blues, purples, cyan accents, warm orange lights
Mood: urban, mysterious, slightly lonely

NO characters, NO foreground objects blocking view
```

### 3.2 task_hub.png (任务中心 - 工作场景)
```
Scene: Digital task hub interface room

Environment:
- modern minimalist space with holographic displays
- floating task cards with glowing edges
- semi-transparent UI panels in air
- clean geometric architecture
- subtle grid patterns on floor

Lighting:
- bright cyan and white interface lights
- purple accent lighting from displays
- clean, high-tech ambiance
- even lighting for readability

Style:
- sleek digital illustration
- UI/UX inspired design
- clean lines and gradients
- futuristic but functional aesthetic

Format: PNG, 1920x1080px
Color palette: white, cyan (#00ffcc), purple (#895AFF), dark navy
Mood: professional, efficient, high-tech

NO characters, NO cluttered UI elements
```

### 3.3 Optional: echo_arrival.png (ECHO降落场景)
```
Scene: Starfield with time portal effect

Environment:
- deep space background with stars
- central glowing portal with purple/cyan energy
- light rays and particles
- timeline visualization elements (subtle)
- 2026 ← 2050 directional indicators

Lighting:
- central bright light source (portal)
- purple and cyan energy glow
- rim lighting on particle effects
- atmospheric depth with light falloff

Style:
- painted sci-fi illustration
- dramatic lighting
- sense of motion and energy
- epic scale

Format: PNG, 1920x1080px
Color palette: deep space black, purple (#895AFF), cyan (#00ffcc), white
Mood: dramatic, hopeful, mysterious

NO characters, focus on environment
```

---

## 生成工具建议

1. **Midjourney**: 适合背景和角色，使用 `--v 6` 和 `--ar 16:9` 或 `--ar 7:4`
2. **DALL-E 3**: 适合精确控制的角色sprite
3. **Stable Diffusion**: 使用ControlNet + transparency mask
4. **手绘 + Photoshop**: 确保完美的透明通道控制

## 导出检查清单

每个文件生成后必须检查：
- [ ] 文件格式真实为PNG (用`file`命令验证)
- [ ] 包含alpha通道 (用图像编辑器确认)
- [ ] 背景完全透明 (无棋盘格、无纯色)
- [ ] 文件大小合理 (sprite < 1.5MB, background < 2MB)
- [ ] 色彩符合规范 (ECHO: #895AFF, badge: #00ffcc)

## 替换流程

1. 生成新图片
2. 重命名原文件为 `*_old.png` (保留备份)
3. 将新文件命名为标准名称放入相应目录
4. 刷新浏览器测试 (cmd+shift+R 强制刷新)
5. 确认无棋盘格后删除 `*_old.png` 备份
