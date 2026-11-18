SU7 车模控制面板 —— 文件说明
================================
panel-bridge.ts   控制面板源码（挂在 #panel 上，三组：车漆/零件显隐/机位预设）
car.html          车模页面（已插入 panel-bridge.ts 的 script 挂载行）

用法：
  这两个文件属于 su7-replica 项目（src/panel-bridge.ts 与根目录 car.html）。
  复制到项目对应位置后，运行：
    npx vite --port 5199
    打开 http://localhost:5199/car.html
  右上角 #panel 即显示控制面板。