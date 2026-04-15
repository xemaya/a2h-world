# Canvas-based Background Removal Workflow

## 问题解决方案

**核心问题**: Gemini API无法生成真正的透明PNG（输出是JPEG with alpha channel）

**解决方案**: 两步流程
1. 生成**纯黑色背景**的sprite（而不是透明或棋盘格）
2. 使用Canvas API在客户端移除纯色背景

## 优势

✅ **零依赖**: 纯HTML5 Canvas API，无需Python/npm包  
✅ **精确控制**: 可调节色彩容差，预览实时效果  
✅ **客户端处理**: 无服务器开销，隐私友好  
✅ **真PNG输出**: Canvas.toBlob()生成真正的PNG RGBA

---

## 完整工作流程

### Step 1: 生成纯黑背景Sprite

```bash
cd game
./build/generate-sprites-solid-bg.sh
```

这会在`assets/temp_raw/`创建4个文件：
- `echo_blank_raw.png` - ECHO中立表情（黑背景）
- `echo_concern_raw.png` - ECHO困惑表情（黑背景）
- `echo_happy_raw.png` - ECHO开心表情（黑背景）
- `kai_raw.png` - KAI角色（黑背景）

### Step 2: 打开Canvas工具

```bash
open build/remove-solid-bg.html
```

或在浏览器中直接打开：
```
file:///Users/huanghaibin/Workspace/.../game/build/remove-solid-bg.html
```

### Step 3: 处理图片

1. **选择文件**: 点击"Select Image"，上传`assets/temp_raw/`中的所有raw文件
2. **配置参数**:
   - Target Background Color: `0,0,0` (黑色RGB)
   - Color Tolerance: 从`20`开始尝试
     - 太低(10-15): 背景移除不干净
     - 太高(50+): 可能损坏角色暗部细节
     - 推荐: 20-40之间微调
3. **处理**: 点击"Process All"
4. **预览**: 查看左右对比，调整tolerance如需要
5. **下载**: 点击每个processed图片下的"Download"按钮

### Step 4: 替换原始Sprite

```bash
cd assets

# 备份旧文件
mv echo/echo_blank.png echo/echo_blank_old.png
mv echo/echo_concern.png echo/echo_concern_old.png
mv echo/echo_happy.png echo/echo_happy_old.png
mv partners/kai.png partners/kai_old.png

# 将下载的文件重命名并移动到位
# (从~/Downloads/或浏览器下载目录)
mv ~/Downloads/echo_blank_raw_transparent.png echo/echo_blank.png
mv ~/Downloads/echo_concern_raw_transparent.png echo/echo_concern.png
mv ~/Downloads/echo_happy_raw_transparent.png echo/echo_happy.png
mv ~/Downloads/kai_raw_transparent.png partners/kai.png

# 验证格式
file echo/*.png partners/kai.png
# 应该全部显示: PNG image data ... RGBA
```

### Step 5: 测试游戏

```bash
# 强制刷新浏览器缓存
# Chrome/Edge: Cmd+Shift+R
# Safari: Cmd+Option+R
```

访问 http://localhost:8080 测试效果

---

## 技术原理

### Canvas API 背景移除核心代码

```javascript
// 1. 绘制图片到Canvas
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

// 2. 获取像素数据 (Uint8ClampedArray: [R,G,B,A, R,G,B,A, ...])
const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
const data = imageData.data;

// 3. 遍历每个像素，匹配目标颜色
for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  // 如果RGB在容差范围内，设置alpha为0（透明）
  if (
    Math.abs(r - targetR) <= tolerance &&
    Math.abs(g - targetG) <= tolerance &&
    Math.abs(b - targetB) <= tolerance
  ) {
    data[i + 3] = 0; // Alpha = 0
  }
}

// 4. 写回Canvas
ctx.putImageData(imageData, 0, 0);

// 5. 导出PNG
canvas.toBlob((blob) => {
  // Download blob as PNG file
}, 'image/png');
```

### 为什么这个方案有效

1. **JPEG→PNG转换**: 即使Gemini输出JPEG，Canvas读取后可导出真PNG
2. **纯色背景易处理**: 黑色(0,0,0)范围明确，不会与角色颜色混淆
3. **容差控制**: 适应JPEG压缩导致的色彩轻微偏移
4. **客户端处理**: 无需安装rembg/Python依赖

---

## Troubleshooting

### 问题：背景没有完全移除

**解决**: 提高tolerance值（25→35→45）

### 问题：角色暗部被意外透明化

**解决**: 降低tolerance值（30→20→15）

**关键提示**: KAI的黑色连帽衫与黑色背景颜色接近！需要小心调节：
- 先处理ECHO（紫色主体，容易分离）
- KAI需要更低的tolerance（15-25范围）
- 或者生成KAI时使用深灰(#1a1a1a)而非纯黑背景

### 问题：下载的PNG还是有背景

**检查**: 浏览器是否支持Canvas.toBlob()  
**解决**: 使用Chrome/Firefox/Edge现代浏览器

---

## 后续优化（可选）

### 方案A: 生成深灰背景（针对KAI）

修改`generate-sprites-solid-bg.sh`，KAI使用深灰背景：
```bash
BG_SOLID_KAI="SOLID DARK GREY BACKGROUND (#1a1a1a), completely flat dark grey color"
```

然后Canvas工具设置：
- Target Color: `26,26,26` (十六进制#1a1a1a)
- Tolerance: 20

### 方案B: 边缘羽化

在Canvas处理后，可选添加1px边缘模糊以平滑锯齿。

---

## 文件清单

生成的文件：
- `build/generate-sprites-solid-bg.sh` - 生图脚本
- `build/remove-solid-bg.html` - Canvas处理工具
- `assets/temp_raw/*_raw.png` - 原始黑背景sprite
- `assets/echo/*.png` - 最终透明sprite
- `assets/partners/*.png` - 最终透明sprite

## 完成后

删除临时文件：
```bash
rm -rf assets/temp_raw
rm assets/**/*_old.png assets/**/*_backup.png
```

验证最终效果：
```bash
file assets/echo/*.png assets/partners/kai.png
# 应该全部是: PNG image data ... RGBA, non-interlaced
```
