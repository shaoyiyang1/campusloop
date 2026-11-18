/**
 * 电池包风格暗色控制面板 —— 挂在 car.html 的 #panel 容器上
 * 通过 window.SU7 与车模场景通信：车漆、零件显隐、机位预设
 * 视觉沿用电池包面板语言（深底、细边框、等宽小字号数值），暗色化，不引新依赖
 */

declare global {
  interface Window {
    SU7: any;
  }
}

export {};

// ------------------------------------------------------------------
// 数据
// ------------------------------------------------------------------
type Paint = { name: string; hex: string };
const PAINTS: Paint[] = [
  { name: "曜石黑", hex: "#15171c" },
  { name: "珍珠白", hex: "#e8eaed" },
  { name: "橄榄绿", hex: "#4a5d4e" },
];

type PartDef = { key: string; label: string };
const PARTS: PartDef[] = [
  { key: "body", label: "车身" },
  { key: "DiPan", label: "底盘" },
  { key: "Glass", label: "玻璃" },
  { key: "houshijin", label: "后视镜" },
  { key: "ChePai", label: "车牌" },
];

type CamPreset = { key: string; label: string; fit: boolean };
const CAMS: CamPreset[] = [
  { key: "full", label: "整车", fit: true },
  { key: "side", label: "侧身", fit: false },
  { key: "rear", label: "车尾", fit: false },
];

// 原厂色：挂载时捕获 bodyMats 当前（GLTF 原始）颜色，「恢复原厂」写回，
// 因 setBodyColor 是单一色通道，无法表达多材质原厂态，故直接对材质对象写回。
const ORIGINAL_BODY_COLORS = new Map<any, string>();

// 侧身/车尾 机位：以包围盒中心为参照，方向取 fitCamera 里的约定
// （front=+x 车头，z=+ 侧）
const CAM_DIRS: Record<string, [number, number, number]> = {
  side: [0.0, 0.18, 1.0],
  rear: [-1.0, 0.22, -0.15],
};

// ------------------------------------------------------------------
// 内嵌样式（暗色）—— 注入到 <style> 避免动 car.html 的 CSS 主体
// ------------------------------------------------------------------
const CSS = `
.sp-root{
  background:linear-gradient(180deg,#151a21,#10151b);
  border:1px solid #232b36;border-radius:11px;
  box-shadow:0 14px 38px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.4);
  color:#e6ebf2;font-size:12.5px;line-height:1.5;
  max-height:calc(100vh - 48px);overflow-y:auto;
  width:320px;
}
.sp-root::-webkit-scrollbar{width:8px}
.sp-root::-webkit-scrollbar-thumb{background:#2b3542;border-radius:4px}
.sp-root::-webkit-scrollbar-track{background:transparent}

.sp-head{display:flex;align-items:center;gap:9px;padding:11px 14px;
  border-bottom:1px solid #1f2733;background:rgba(0,0,0,.18);position:sticky;top:0;z-index:2}
.sp-head .lg{width:26px;height:26px;border-radius:8px;flex:none;
  background:linear-gradient(140deg,#3b82f6,#1e3a8a 60%,#0f172a);
  display:grid;place-items:center;color:#fff;font-weight:800;font-size:10px;letter-spacing:-.4px;
  box-shadow:0 4px 12px rgba(59,130,246,.35)}
.sp-head h1{font-size:12px;font-weight:700;letter-spacing:.2px;line-height:1.2}
.sp-head p{font-size:9.5px;color:#7c8a9c;font-family:ui-monospace,Consolas,monospace;margin-top:1px}

.sp-sec{padding:11px 13px 13px;border-bottom:1px solid #1c2430}
.sp-sec:last-child{border-bottom:none}
.sp-sec-title{display:flex;align-items:center;gap:7px;font-size:9.5px;font-weight:700;
  letter-spacing:.9px;color:#7c8a9c;text-transform:uppercase;margin-bottom:9px}
.sp-sec-title::before{content:"";width:5px;height:5px;border-radius:50%;background:#3b82f6}
.sp-sec-title::after{content:"";flex:1;height:1px;background:#1f2833}

.sp-note{font-size:10px;color:#6b7788;line-height:1.5;margin-top:7px}

/* 车漆 */
.sp-swatches{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.sp-sw{position:relative;border:1px solid #243040;border-radius:8px;overflow:hidden;
  padding:0;background:#0e1319;cursor:pointer;transition:.14s;display:flex;flex-direction:column}
.sp-sw .sw{width:100%;height:34px;display:block}
.sp-sw .nm{font-size:10px;color:#9aa7ba;padding:5px 6px 6px;text-align:center;font-family:ui-monospace,Consolas,monospace}
.sp-sw:hover{border-color:#3b82f6}
.sp-sw.on{border-color:#3b82f6;box-shadow:0 0 0 1px #3b82f6 inset}
.sp-restore{margin-top:7px;width:100%;display:flex;align-items:center;gap:7px;
  padding:7px 10px;border:1px solid #243040;border-radius:8px;background:#0e1319;color:#9aa7ba;
  font-size:11px;cursor:pointer;transition:.14s;justify-content:center}
.sp-restore:hover{border-color:#3b82f6;color:#e6ebf2}

/* 零件显隐 */
.sp-layer{display:flex;align-items:center;gap:9px;padding:6px 8px;border-radius:7px;cursor:pointer;
  transition:.14s;border:1px solid transparent;margin-bottom:2px;background:transparent}
.sp-layer:hover{background:#131a24;border-color:#1f2833}
.sp-layer.on{background:rgba(59,130,246,.10);border-color:#2a3a52}
.sp-layer .cb{width:14px;height:14px;border-radius:4px;border:1.5px solid #3a4658;background:#0e1319;
  flex:none;display:grid;place-items:center;transition:.14s;position:relative}
.sp-layer.on .cb{background:#3b82f6;border-color:#3b82f6}
.sp-layer.on .cb::after{content:"";width:4px;height:8px;border-left:2px solid #fff;border-bottom:2px solid #fff;
  transform:translate(-1px,-1px) rotate(-45deg) scale(.8)}
.sp-layer .nm{font-size:12px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-layer .ct{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#6b7788;
  background:#131a24;padding:1px 5px;border-radius:4px;border:1px solid #1f2833}
.sp-layer.off .nm{color:#5b6675}
.sp-layer .cb.off{opacity:.5}
.sp-layer.miss{opacity:.4}
.sp-layer.miss .nm{color:#5b6675}

/* 机位 */
.sp-cams{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.sp-cam{padding:9px 4px;border-radius:8px;border:1px solid #243040;background:#0e1319;
  font-size:11.5px;color:#9aa7ba;cursor:pointer;transition:.14s;text-align:center;
  font-family:ui-monospace,Consolas,monospace;letter-spacing:.2px}
.sp-cam:hover{border-color:#3b82f6;color:#e6ebf2}
.sp-cam.on{background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:700;
  box-shadow:0 2px 8px rgba(59,130,246,.4)}

/* 数值读牌 */
.sp-val{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#e6ebf2;font-weight:600}
`;

// ------------------------------------------------------------------
// 构建 DOM
// ------------------------------------------------------------------
const state = {
  activePaint: -1, // -1 = 原厂
  parts: new Map<string, { nodes: any[]; on: boolean }>(),
  activeCam: -1,
};

function el<K extends keyof HTMLElementTagNameMap, T extends HTMLElement = HTMLElement>(
  tag: K,
  cls?: string
): T {
  const e = document.createElement(tag as any);
  if (cls) e.className = cls;
  return e as T;
}

function section(title: string): HTMLElement {
  const s = el("div", "sp-sec");
  const t = el("div", "sp-sec-title");
  t.textContent = title;
  s.appendChild(t);
  return s;
}

function buildRoot(): HTMLElement {
  const root = el("div", "sp-root");
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", "车模控制面板");

  // head
  const head = el("div", "sp-head");
  const lg = el("div", "lg");
  lg.textContent = "SU7";
  const ttl = el("div");
  const h1 = el("h1");
  h1.textContent = "车模控制面板";
  const p = el("p");
  p.textContent = "paint · parts · camera";
  ttl.appendChild(h1);
  ttl.appendChild(p);
  head.appendChild(lg);
  head.appendChild(ttl);
  root.appendChild(head);

  // —— 车漆 ——
  const paintSec = section("车漆预设");
  const swatches = el("div", "sp-swatches");
  PAINTS.forEach((pt, i) => {
    const b = el("button", "sp-sw") as HTMLButtonElement;
    b.type = "button";
    b.dataset.idx = String(i);
    b.title = pt.hex;
    const sw = el("span", "sw");
    sw.style.background = pt.hex;
    const nm = el("span", "nm");
    nm.textContent = pt.name;
    b.appendChild(sw);
    b.appendChild(nm);
    b.addEventListener("click", () => applyPaint(i));
    swatches.appendChild(b);
  });
  paintSec.appendChild(swatches);
  const restore = el("button", "sp-restore") as HTMLButtonElement;
  restore.type = "button";
  const rc = el("span");
  rc.textContent = "↺ 恢复原厂";
  restore.appendChild(rc);
  restore.addEventListener("click", () => applyPaint(-1));
  paintSec.appendChild(restore);
  const pn = el("div", "sp-note");
  pn.textContent = "点击色块改车漆；「恢复原厂」还原 GLTF 原始材质。";
  paintSec.appendChild(pn);
  root.appendChild(paintSec);

  // —— 零件显隐 ——
  const partSec = section("零件显隐");
  const list = el("div");
  PARTS.forEach((pd, i) => {
    const b = el("button", "sp-layer on") as HTMLButtonElement;
    b.type = "button";
    b.dataset.key = pd.key;
    b.dataset.idx = String(i);
    const cb = el("span", "cb");
    const nm = el("span", "nm");
    nm.textContent = pd.label;
    const ct = el("span", "ct");
    ct.textContent = pd.key;
    b.appendChild(cb);
    b.appendChild(nm);
    b.appendChild(ct);
    b.addEventListener("click", () => togglePart(i));
    list.appendChild(b);
  });
  partSec.appendChild(list);
  const partNote = el("div", "sp-note");
  partNote.textContent = "按节点名匹配（body/DiPan/Glass/houshijin/ChePai），点击切换 visible。未匹配到零件会标灰。";
  partSec.appendChild(partNote);
  root.appendChild(partSec);

  // —— 机位 ——
  const camSec = section("机位预设");
  const cams = el("div", "sp-cams");
  CAMS.forEach((c, i) => {
    const b = el("button", "sp-cam") as HTMLButtonElement;
    b.type = "button";
    b.dataset.idx = String(i);
    b.textContent = c.label;
    b.addEventListener("click", () => applyCam(i));
    cams.appendChild(b);
  });
  camSec.appendChild(cams);
  const camNote = el("div", "sp-note");
  camNote.textContent = "通过 camera-controls 的 setLookAt 做平滑过渡，不直接改 camera.position。";
  camSec.appendChild(camNote);
  root.appendChild(camSec);

  return root;
}

// ------------------------------------------------------------------
// 与 window.SU7 的通信
// ------------------------------------------------------------------
function bodyMats(): any[] {
  const car: any = window.SU7?.car;
  if (!car) return [];
  const mats: any[] = [];
  const seen = new Set<any>();
  car.traverse((o: any) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    ms.forEach((m: any) => {
      if (m && /body/i.test(m.name || "") && !seen.has(m)) {
        seen.add(m);
        mats.push(m);
      }
    });
  });
  return mats;
}

// 挂载时捕获原始色（此时 GLTF 颜色未被改过）
function captureOriginals() {
  if (ORIGINAL_BODY_COLORS.size > 0) return;
  bodyMats().forEach((m) => {
    ORIGINAL_BODY_COLORS.set(m, m.color ? m.color.getHexString() : null);
  });
}

function applyPaint(i: number) {
  state.activePaint = i;
  document.querySelectorAll<HTMLElement>(".sp-sw").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.idx) === i);
  });
  document.querySelector<HTMLButtonElement>(".sp-restore")?.classList.toggle(
    "on",
    i === -1
  );
  if (i === -1) {
    // 原厂：把每块 body 材质写回捕获到的原始色（多材质态）
    bodyMats().forEach((m) => {
      const orig = ORIGINAL_BODY_COLORS.get(m);
      if (orig && m.color) {
        m.color.set("#" + orig);
        m.needsUpdate = true;
      }
    });
    return;
  }
  const p = PAINTS[i];
  try {
    window.SU7?.setBodyColor?.(p.hex);
  } catch (e) {
    console.warn("[panel-bridge] setBodyColor failed", e);
  }
}

function resolvePartNodes(key: string): any[] {
  const parts: any[] = window.SU7?.parts || [];
  const found: any[] = [];
  for (const it of parts) {
    if (!it || !it.isMesh) continue;
    if (it.name === key) found.push(it);
  }
  return found;
}

function togglePart(i: number) {
  const pd = PARTS[i];
  let entry = state.parts.get(pd.key);
  if (!entry) {
    const nodes = resolvePartNodes(pd.key);
    entry = { nodes, on: true };
    state.parts.set(pd.key, entry);
  }
  entry.on = !entry.on;
  entry.nodes.forEach((n) => (n.visible = entry.on));
  const btn = document.querySelector<HTMLElement>(
    `.sp-layer[data-idx="${i}"]`
  );
  if (btn) {
    btn.classList.toggle("on", entry.on);
    btn.classList.toggle("off", !entry.on);
    // 命中/未命中
    btn.classList.toggle("miss", entry.nodes.length === 0);
    const ct = btn.querySelector(".ct");
    if (ct) ct.textContent = entry.nodes.length ? String(entry.nodes.length) : "0";
  }
}

function applyCam(i: number) {
  state.activeCam = i;
  document.querySelectorAll<HTMLElement>(".sp-cam").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.idx) === i);
  });
  const preset = CAMS[i];
  const ctl: any = window.SU7?.controls;
  const car: any = window.SU7?.car;
  const cam = window.SU7?.camera;
  if (!ctl) return;

  if (preset.fit) {
    // 整车：fitToBox 包围盒（camera-controls 的 API，平滑过渡）
    if (ctl.fitToBox && car) {
      ctl
        .fitToBox(car, true, { cover: true })
        .catch?.((e: any) => console.warn("[panel-bridge] fitToBox", e));
    }
    return;
  }

  // 侧身/车尾：以包围盒中心为目标，方向取 CAM_DIRS
  const dir = CAM_DIRS[preset.key];
  if (!dir || !cam) return;
  const maxDim: number =
    (cam.userData && cam.userData.maxDim) ||
    5.0; // 兜底
  const target =
    cam.userData && cam.userData.target
      ? { x: cam.userData.target.x, y: cam.userData.target.y, z: cam.userData.target.z }
      : { x: 0, y: 0.8, z: 0 };

  const dist = (maxDim / 2) / Math.tan(((cam.fov || 35) * Math.PI) / 360) * 1.5;
  const d = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  const px = target.x + (dir[0] / d) * dist;
  const py = target.y + (dir[1] / d) * dist;
  const pz = target.z + (dir[2] / d) * dist;
  ctl
    .setLookAt(px, py, pz, target.x, target.y, target.z, true)
    .catch?.((e: any) => console.warn("[panel-bridge] setLookAt", e));
}

// ------------------------------------------------------------------
// 初始化
// ------------------------------------------------------------------
function boot() {
  const host = document.querySelector<HTMLElement>("#panel");
  if (!host) {
    console.warn("[panel-bridge] #panel not found");
    return;
  }
  if (host.querySelector(".sp-root")) return; // 已挂
  const root = buildRoot();
  host.appendChild(root);

  // 注入样式（一次）
  if (!document.getElementById("sp-style")) {
    const st = el("style");
    st.id = "sp-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // 捕获原厂颜色（必须在首次改色之前）
  captureOriginals();

  // 预解析零件节点（不改变 visible，仅用于显示命中计数）
  PARTS.forEach((pd) => {
    const nodes = resolvePartNodes(pd.key);
    state.parts.set(pd.key, { nodes, on: true });
    const btn = document.querySelector<HTMLElement>(
      `.sp-layer[data-key="${pd.key}"]`
    );
    if (btn) {
      const ct = btn.querySelector(".ct");
      if (ct) ct.textContent = nodes.length ? String(nodes.length) : "0";
      if (nodes.length === 0) btn.classList.add("miss");
    }
  });
}

// 等待 SU7 就绪（car.ts 在 am.on("ready") 后赋值 window.SU7.parts）
// 这里轮询直到 SU7.parts 出现，再挂载，避免命中 0
(function waitAndBoot() {
  if (window.SU7 && Array.isArray(window.SU7.parts) && window.SU7.parts.length > 0) {
    boot();
  } else {
    requestAnimationFrame(waitAndBoot);
  }
})();
