# TODO: Sprite图片问题

## 问题
当前的kai.png和echo_*.png虽然扩展名是PNG，但实际是JPEG格式（无alpha通道）。
棋盘格背景被烤入了图片数据中，无法通过CSS或ImageMagick移除。

## 临时方案
使用纯色深色背景替代

## 长期方案
需要重新生成sprite图片，要求：
1. 真正的PNG RGBA格式
2. 完全透明的背景
3. 高质量的角色绘制

### KAI生图提示词（参考）
- 赛博朋克风格，20多岁亚洲男性
- 黑色连帽衫，青色霓虹边缘光
- 紫色调皮肤高光
- 胸前a2hmarket.ai标志
- **关键**：transparent background, no checkerboard, PNG with alpha channel

### ECHO生图提示词（参考World Bible §2.1）
- 主色#895AFF紫色
- 3根天线
- 胸口A2H徽章（#00ffcc青绿色）
- **关键**：transparent background, PNG RGBA format
