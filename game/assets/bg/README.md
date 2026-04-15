# 背景图资源说明

## 现有背景
- `market_hall.png` - A2H Market交易大厅（主场景）
- `ruins_2050.png` - 2050年废墟场景（cold open）

## 待添加背景（占位符状态）
以下背景当前使用CSS渐变占位，需要替换为真实图片：

### 1. street_alley.png (待生成)
**用途**: KAI出场、街道场景  
**规格**: 1920x1080px PNG  
**风格**: 赛博朋克后巷，霓虹灯，紫青色调  
**生图prompt**: 见 `REGENERATE_SPRITES.md` §3.1

### 2. task_hub.png (待生成)  
**用途**: 任务执行场景，工作空间  
**规格**: 1920x1080px PNG  
**风格**: 未来科技感，全息界面，简洁明亮  
**生图prompt**: 见 `REGENERATE_SPRITES.md` §3.2

### 3. echo_arrival.png (可选，待生成)
**用途**: ECHO降临/时间穿越场景  
**规格**: 1920x1080px PNG  
**风格**: 太空星域，传送门特效，史诗感  
**生图prompt**: 见 `REGENERATE_SPRITES.md` §3.3

## 占位符系统
当背景文件不存在时，游戏会使用CSS渐变背景：
- `street_alley.png` → 深紫到深蓝渐变
- `task_hub.png` → 青色科技感渐变
- `echo_arrival.png` → 深空紫色渐变

占位符代码在 `src/ui/screens.js` 的 `renderSceneBg()` 函数中。

## 文件命名规范
- 小写+下划线: `market_hall.png`, `street_alley.png`
- PNG格式，优化后< 2MB
- 尺寸: 1920x1080px (16:9)
