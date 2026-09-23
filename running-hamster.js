/*!
 * <running-hamster> — 速度(km/h)に応じて走り方が変わるハムスター
 * 依存なし・背景透明・SVG。フレームワーク問わず使えます。
 *
 * 使い方:
 *   <script src="running-hamster.js"></script>
 *   <running-hamster speed="12" style="width:240px"></running-hamster>
 *   el.speed = 20;              // JSから変更（なめらかに追従）
 *   el.addEventListener('gaitchange', e => console.log(e.detail.gait)); // rest|walk|trot|sprint
 *
 * 属性:
 *   speed       0〜30 (km/h)。範囲外はクランプ
 *   max-speed   上限 (既定 30)。速度帯はこの値に比例して決まります
 *   response    追従の速さ (既定 3。大きいほど即座に変わる / 0で即時)
 *   shadow      "false" で足元の影を消す
 *   paused      付けると停止
 * サイズは CSS の width で指定（高さは自動、縦横比 240:190）。
 */
(() => {
  const TAU = Math.PI * 2;
  const NS = 'http://www.w3.org/2000/svg';
  const C = {
    body: '#EDBE92', back: '#D99F6E', belly: '#FBF4EA', paw: '#F2BBB5',
    earIn: '#F0B6B6', cheek: '#F1A8AE', nose: '#D98890', eye: '#3A2E2A', whisker: '#6B5048',
  };
  const OFF = {
    walk: { BL: 0, BR: 0.5, FL: 0.25, FR: 0.75 },
    trot: { BL: 0, BR: 0.5, FL: 0.5, FR: 1.0 },
    gallop: { BL: 0, BR: 0.1, FL: 0.5, FR: 0.6 },
  };
  const PAW_X = { BL: 70, BR: 86, FL: 146, FR: 160 };
  const HIP = { BL: 70, BR: 84, FL: 146, FR: 158 };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  class RunningHamster extends HTMLElement {
    static get observedAttributes() { return ['speed', 'max-speed', 'shadow', 'paused']; }

    constructor() {
      super();
      this._target = 0; this._v = 0; this._phase = 0; this._t = 0;
      this._last = null; this._raf = 0; this._visible = true; this._gait = null;
      const root = this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = ':host{display:inline-block;width:240px;line-height:0}svg{width:100%;height:auto;overflow:visible}';
      root.appendChild(style);
      this._build(root);
      this._tick = this._tick.bind(this);
    }

    get speed() { return this._target; }
    set speed(v) { this._target = +v || 0; }
    get gait() { return this._gait; }

    attributeChangedCallback(name, _, val) {
      if (name === 'speed') this._target = parseFloat(val) || 0;
      if (name === 'shadow') this._shadow.style.display = val === 'false' ? 'none' : '';
      if (name === 'paused') this._sync();
    }

    connectedCallback() {
      if (this.hasAttribute('speed')) this._v = this._target = parseFloat(this.getAttribute('speed')) || 0;
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver((e) => { this._visible = e[0].isIntersecting; this._sync(); });
        this._io.observe(this);
      }
      this._render(0);
      this._sync();
    }

    disconnectedCallback() { cancelAnimationFrame(this._raf); this._raf = 0; if (this._io) this._io.disconnect(); }

    _sync() {
      const run = this.isConnected && this._visible && !this.hasAttribute('paused');
      if (run && !this._raf) { this._last = null; this._raf = requestAnimationFrame(this._tick); }
      if (!run && this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
    }

    _tick(now) {
      const dt = this._last == null ? 0 : Math.min(0.1, (now - this._last) / 1000);
      this._last = now;
      this._render(dt);
      this._raf = requestAnimationFrame(this._tick);
    }

    _build(root) {
      const svg = el('svg', { viewBox: '-4 -4 240 190' }, root);
      this._shadow = el('ellipse', { cx: 112, cy: 178, rx: 75, ry: 6, fill: 'rgba(60,40,30,0.12)' }, svg);
      this._legs = {};
      for (const k of ['BL', 'FL', 'BR', 'FR']) {
        const far = k[1] === 'L', hind = k[0] === 'B';
        const g = el('g', {}, svg);
        this._legs[k] = {
          line: el('line', { stroke: far ? C.back : C.body, 'stroke-width': hind ? 18 : 15, 'stroke-linecap': 'round' }, g),
          paw: el('ellipse', { rx: hind ? 11 : 9, ry: 5, fill: C.paw, opacity: far ? 0.8 : 1 }, g),
        };
      }
      const body = this._body = el('g', {}, svg);
      const ear = (cx, cy, r, far) => {
        const g = el('g', {}, body);
        el('ellipse', { cx, cy, rx: r, ry: r * 1.1, fill: far ? C.back : C.body }, g);
        el('ellipse', { cx: cx + 1, cy: cy + 2, rx: r * 0.55, ry: r * 0.65, fill: C.earIn }, g);
        return { g, cx, cy: cy + r };
      };
      this._earFar = ear(134, 40, 13, true);
      el('circle', { cx: 20, cy: 116, r: 8, fill: C.body }, body);
      el('path', { fill: C.body, d: 'M 40 156 C 12 146 8 100 30 74 C 50 48 95 36 125 42 C 150 46 170 54 184 70 C 196 82 206 94 208 104 C 210 112 204 120 194 122 C 184 126 180 132 178 142 C 174 154 150 160 120 161 C 90 162 60 162 40 156 Z' }, body);
      el('path', { fill: C.back, opacity: 0.55, d: 'M 30 80 C 50 50 95 38 125 44 C 150 48 168 56 180 68 C 150 60 110 58 80 70 C 60 78 44 92 36 110 C 32 100 30 90 30 80 Z' }, body);
      el('path', { fill: C.belly, d: 'M 58 154 C 70 128 110 116 150 120 C 168 122 178 132 178 142 C 174 154 150 160 120 161 C 90 162 70 160 58 154 Z' }, body);
      el('ellipse', { cx: 193, cy: 110, rx: 16, ry: 12, fill: C.belly }, body);
      el('ellipse', { cx: 176, cy: 104, rx: 14, ry: 9, fill: C.cheek, opacity: 0.7 }, body);
      this._earNear = ear(158, 44, 15, false);
      this._eye = el('ellipse', { cx: 180, cy: 80, rx: 6.5, ry: 7.5, fill: C.eye }, body);
      this._glint = el('circle', { cx: 182, cy: 78.5, r: 2.3, fill: '#fff' }, body);
      el('path', { fill: C.nose, d: 'M 204 99 C 208 98 211 101 209 104 C 207 107 203 106 202 103 C 201 101 202 99 204 99 Z' }, body);
      const w = el('g', { stroke: C.whisker, 'stroke-width': 1.2, 'stroke-linecap': 'round', opacity: 0.45 }, body);
      ['M 200 106 L 222 100', 'M 200 109 L 223 109', 'M 199 112 L 220 118'].forEach((d) => el('path', { d }, w));
    }

    _render(dt) {
      const maxV = parseFloat(this.getAttribute('max-speed')) || 30;
      const k = maxV / 30; // 速度帯を max-speed に比例させる
      const resp = this.hasAttribute('response') ? parseFloat(this.getAttribute('response')) : 3;
      const target = clamp(this._target, 0, maxV);
      this._v = resp > 0 ? this._v + (target - this._v) * Math.min(1, dt * resp) : target;
      if (Math.abs(target - this._v) < 0.01) this._v = target;
      const v = this._v / k; // 0..30 の正規化速度
      this._t += dt;
      this._phase += (v <= 0.01 ? 0 : 1.0 + 0.12 * v) * dt;

      const gait = v < 0.3 ? 'rest' : v < 6.5 ? 'walk' : v < 16 ? 'trot' : 'sprint';
      if (gait !== this._gait) {
        const prev = this._gait; this._gait = gait;
        if (prev) this.dispatchEvent(new CustomEvent('gaitchange', { detail: { gait, speed: this._v } }));
      }

      const phase = this._phase, T = this._t, cyc = TAU * phase;
      const amp = smooth(0, 1.5, v), wT = smooth(5, 8, v), wG = smooth(14, 18, v);
      const A = (3 + 0.45 * v) * amp, lift = (2 + 0.35 * v) * amp;
      const bobWT = (1.5 + 0.2 * v) * amp * (1 - Math.cos(2 * cyc)) / 2;
      const bobG = (4 + 0.45 * v) * Math.max(0, Math.sin(cyc));
      const bob = lerp(bobWT, bobG, wG);
      const st = wG * 0.07 * Math.sin(cyc);
      const breathe = (1 - amp) * 0.025 * Math.sin(TAU * T / 2.5);
      const sx = 1 + st - breathe * 0.5, sy = 1 - st * 0.8 + breathe;
      const lean = (v / 30) * 10, earRot = -(v / 30) * 30;
      const blink = (T % 3.7) < 0.12 && v < 16;
      const eyeH = 15 * (1 - 0.55 * wG) * (blink ? 0.12 : 1);

      for (const key in this._legs) {
        const off = lerp(lerp(OFF.walk[key], OFF.trot[key], wT), OFF.gallop[key], wG);
        const th = TAU * (phase + off);
        const x = PAW_X[key] + A * Math.sin(th);
        const y = 171 - lift * Math.max(0, Math.cos(th)) - bob * 0.5;
        const hx = HIP[key] + (x - PAW_X[key]) * 0.3, hy = 146 - bob;
        const L = this._legs[key];
        L.line.setAttribute('x1', hx); L.line.setAttribute('y1', hy);
        L.line.setAttribute('x2', x); L.line.setAttribute('y2', y - 4);
        L.paw.setAttribute('cx', x + 3); L.paw.setAttribute('cy', y);
      }
      this._body.setAttribute('transform', `translate(0 ${-bob}) translate(112 160) rotate(${lean}) scale(${sx} ${sy}) translate(-112 -160)`);
      this._earFar.g.setAttribute('transform', `rotate(${earRot} ${this._earFar.cx} ${this._earFar.cy})`);
      this._earNear.g.setAttribute('transform', `rotate(${earRot * 0.8} ${this._earNear.cx} ${this._earNear.cy})`);
      this._eye.setAttribute('ry', eyeH / 2);
      this._glint.setAttribute('cy', 80 - eyeH * 0.2);
      this._glint.setAttribute('opacity', blink ? 0 : 1 - wG * 0.6);
      this._shadow.setAttribute('rx', 75 * (1 - Math.min(bob, 30) / 60));
    }
  }

  if (!customElements.get('running-hamster')) customElements.define('running-hamster', RunningHamster);
})();
