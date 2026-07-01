# 九宫格拼图

## 功能
- 3x3 拼图，1 个空白格
- 点击与空白格相邻的图片块可移动
- `imgas` 文件夹里有多少图片，就有多少关卡

## 使用步骤
1. 把图片放到 `imgas` 文件夹（支持 `.jpg .jpeg .png .webp .gif`）。
2. 在项目目录执行：
   ```powershell
   node .\scripts\generate-levels.mjs
   ```
3. 启动一个静态服务器并打开页面（任意方式均可）。例如：
   ```powershell
   python -m http.server 8080
   ```
   然后访问 `http://localhost:8080`。

## 说明
- 关卡列表由 `levels.json` 提供。
- 每次新增/删除图片后，重新执行一次生成脚本即可更新关卡数。
