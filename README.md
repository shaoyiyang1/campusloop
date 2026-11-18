# CampusLoop 开源资料库

> 一个极其方便且低碳的校园效率工具 —— 教学实验与车模可视化项目归档

本仓库收录两个可离线运行的独立项目，均无需后端、无需联网、无需安装依赖即可打开体验。

---

## 目录结构

```
.
├── battery-lab-offline/   # 动力电池虚拟仿真实验平台（离线版）
└── su7-panel/             # 小米 SU7 车模控制面板与离线驾驶版
```

---

## 1. 电池虚拟仿真实验平台（离线版）

`battery-lab-offline/`

基于 three.js 的纯前端虚拟仿真教学平台，全部资源已内联，**无 CDN、无外部请求**。

### 运行方式

1. 将整个 `battery-lab-offline` 文件夹拷到任意位置；
2. 双击 `index.html`（或 `start.bat`）进入门户；
3. 点击实验卡片即可在页内展开实验。

> 文件夹内所有 HTML 需放在一起。详细使用说明见 `battery-lab-offline/使用说明.md`。

### 包含内容

| 文件 | 说明 |
|---|---|
| `index.html` | 平台门户：5 个实验 + 3 个认知模块 + 环境自检 |
| `exp01.html` | 实验 01 单体性能测试与危化品安全操作 |
| `exp02.html` | 实验 02 热失控特性与热管理安全 |
| `exp03.html` | 实验 03 BMS 算法仿真与 AI 安全诊断 |
| `exp04.html` | 实验 04 高压系统与特种设备集成 |
| `exp05.html` | 实验 05 梯次利用与回收危化品处置 |
| `param.html` | 参数库：116 条参数 × 8 个域 |
| `archive.html` | 实验档案：存档、时间线、评分与导出 |
| `battery-pack-3d.html` | 整包数字孪生：12 层拆解 + 整车底盘 + X 光 + 电路拓扑 |

---

## 2. SU7 车模控制面板

`su7-panel/`

小米 SU7 车模的离线驾驶版页面与控制面板脚本，包含多张预览截图。

### 运行方式

**方式 A —— 直接体验（零配置）**

双击 `小米SU7车模-离线驾驶版.html` 即可在浏览器打开，无需任何依赖。

**方式 B —— 接入开发（Vite）**

`panel-bridge.ts` 与 `car.html` 属于原 `su7-replica` 项目：

```bash
# 将 panel-bridge.ts 放到 src/，car.html 放到项目根目录后：
npx vite --port 5199
# 打开 http://localhost:5199/car.html
```

右上角 `#panel` 即显示控制面板（车漆 / 零件显隐 / 机位预设）。

---

## 许可

详见 [LICENSE](LICENSE)。如未指定，默认遵循 MIT 许可证。

---

*由 邵奕阳（Shaoyiyang123）整理开源 · 2026*
