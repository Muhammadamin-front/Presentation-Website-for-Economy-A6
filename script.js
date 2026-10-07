/* =========================================================
   A6 — Prezentatsiya dvigateli + animatsiya effektlari
   Effektlar: Neon Mesh (kinetic.md), Aurora (prompt-background-light.md),
   Sonar Grid (sonar-grid-effect.md), Card Flip (flip-card.md),
   3D CoverFlow (prompt.md), TextRoll (2-prompt.md)
   ========================================================= */

const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- TextRoll (2-prompt.md) ---------------- */
function prepareRoll(el) {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);
  let i = 0;
  text.split(" ").forEach((word, wi, words) => {
    const w = document.createElement("span");
    w.style.whiteSpace = "nowrap";
    w.setAttribute("aria-hidden", "true");
    for (const ch of word) {
      const c = document.createElement("span");
      c.className = "roll__ch";
      c.style.setProperty("--i", i++);
      c.innerHTML = `<span class="roll__a">${ch}</span><span class="roll__b">${ch}</span><span class="roll__ghost">${ch}</span>`;
      w.appendChild(c);
    }
    el.appendChild(w);
    if (wi < words.length - 1) { el.appendChild(document.createTextNode(" ")); i++; }
  });
}
function playRoll(el) {
  el.classList.remove("is-rolling");
  void el.offsetWidth;
  el.classList.add("is-rolling");
}

/* ---------------- Neon Mesh (kinetic.md) ---------------- */
function createNeonMesh(canvas, host) {
  const ctx = canvas.getContext("2d", { alpha: false });
  let raf = 0, width = 0, height = 0, time = 0;
  const mouse = { x: -1000, y: -1000, targetAngleX: 0.2, targetAngleY: -0.3, angleX: 0.2, angleY: -0.3, radius: 180 };
  let points = [], constraints = [];
  const neonLime = "#BEF202", baseMesh = "101, 163, 13", bg = "#050702";

  const initMesh = () => {
    points = []; constraints = [];
    const spacing = 42;
    const cols = Math.ceil((width * 1.1) / spacing) + 1;
    const rows = Math.ceil((height * 1.1) / spacing) + 1;
    const grid = [];
    const startX = -(cols * spacing) / 2, startY = -(rows * spacing) / 2;
    for (let j = 0; j < rows; j++) {
      grid[j] = [];
      for (let i = 0; i < cols; i++) {
        const bx = startX + i * spacing, by = startY + j * spacing;
        const p = { x: bx, y: by, z: 0, oldX: bx, oldY: by, oldZ: 0,
          pinned: i === 0 || i === cols - 1 || j === 0 || j === rows - 1,
          baseX: bx, baseY: by, baseZ: 0, projX: 0, projY: 0, projScale: 1 };
        points.push(p); grid[j][i] = p;
      }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (i < cols - 1) constraints.push({ p1: grid[j][i], p2: grid[j][i + 1], length: spacing });
      if (j < rows - 1) constraints.push({ p1: grid[j][i], p2: grid[j + 1][i], length: spacing });
    }
  };
  const resize = () => {
    width = host.clientWidth; height = host.clientHeight;
    const dpr = DPR();
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initMesh();
  };
  host.addEventListener("mousemove", (e) => {
    const r = host.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    mouse.targetAngleY = (mouse.x / width - 0.5) * 2 * 0.45;
    mouse.targetAngleX = -(mouse.y / height - 0.5) * 2 * 0.35 + 0.2;
  });
  host.addEventListener("mouseleave", () => { mouse.x = -1000; mouse.y = -1000; mouse.targetAngleX = 0.2; mouse.targetAngleY = 0; });

  const render = () => {
    time += 0.025;
    mouse.angleX += (mouse.targetAngleX - mouse.angleX) * 0.05;
    mouse.angleY += (mouse.targetAngleY - mouse.angleY) * 0.05;
    const cosX = Math.cos(mouse.angleX), sinX = Math.sin(mouse.angleX);
    const cosY = Math.cos(mouse.angleY), sinY = Math.sin(mouse.angleY);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height);

    // Verlet integratsiyasi + to‘lqin
    for (const p of points) {
      if (p.pinned) continue;
      const vx = (p.x - p.oldX) * 0.93, vy = (p.y - p.oldY) * 0.93, vz = (p.z - p.oldZ) * 0.93;
      p.oldX = p.x; p.oldY = p.y; p.oldZ = p.z;
      p.x += vx; p.y += vy; p.z += vz;
      const ambientZ = Math.sin(p.baseX * 0.015 + p.baseY * 0.015 + time) * 18;
      p.x += (p.baseX - p.x) * 0.04; p.y += (p.baseY - p.y) * 0.04; p.z += (p.baseZ + ambientZ - p.z) * 0.04;
    }
    // 3D proyeksiya + kursor kuchi
    const perspective = 600, cx = width / 2, cy = height / 2;
    for (const p of points) {
      const rx1 = p.x * cosY + p.z * sinY, ry1 = p.y, rz1 = -p.x * sinY + p.z * cosY;
      const ry2 = ry1 * cosX - rz1 * sinX, rz2 = ry1 * sinX + rz1 * cosX + 400;
      const scale = perspective / Math.max(1, rz2);
      p.projScale = scale; p.projX = cx + rx1 * scale; p.projY = cy + ry2 * scale;
      if (!p.pinned) {
        const dx = p.projX - mouse.x, dy = p.projY - mouse.y, dist = Math.hypot(dx, dy);
        if (dist < mouse.radius && dist > 0) {
          const force = (1 - dist / mouse.radius) * 22, a = Math.atan2(dy, dx);
          p.x += (Math.cos(a) * force) / scale; p.y += (Math.sin(a) * force) / scale; p.z -= (force * 1.5) / scale;
        }
      }
    }
    // Cheklovlarni yechish
    for (let it = 0; it < 4; it++) for (const c of constraints) {
      const dx = c.p2.x - c.p1.x, dy = c.p2.y - c.p1.y, dz = c.p2.z - c.p1.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz), delta = (dist - c.length) / (dist || 1);
      if (!c.p1.pinned) { c.p1.x += dx * 0.5 * delta; c.p1.y += dy * 0.5 * delta; c.p1.z += dz * 0.5 * delta; }
      if (!c.p2.pinned) { c.p2.x -= dx * 0.5 * delta; c.p2.y -= dy * 0.5 * delta; c.p2.z -= dz * 0.5 * delta; }
    }
    // Chizish
    for (const c of constraints) {
      const mx = (c.p1.projX + c.p2.projX) / 2, my = (c.p1.projY + c.p2.projY) / 2;
      const hot = Math.hypot(mouse.x - mx, mouse.y - my) < mouse.radius;
      const s = (c.p1.projScale + c.p2.projScale) / 2;
      ctx.strokeStyle = hot ? neonLime : `rgba(${baseMesh}, ${Math.min(1, Math.max(0.1, 0.25 * s))})`;
      ctx.lineWidth = hot ? 2 * s : 0.8 * s;
      ctx.beginPath(); ctx.moveTo(c.p1.projX, c.p1.projY); ctx.lineTo(c.p2.projX, c.p2.projY); ctx.stroke();
    }
    ctx.fillStyle = neonLime;
    for (const p of points) {
      if (Math.hypot(mouse.x - p.projX, mouse.y - p.projY) < 100) {
        ctx.beginPath(); ctx.arc(p.projX, p.projY, 2.5 * p.projScale, 0, Math.PI * 2); ctx.fill();
      }
    }
    raf = requestAnimationFrame(render);
  };
  let sized = false;
  return {
    start() { if (!sized) { resize(); sized = true; } if (!raf) raf = requestAnimationFrame(render); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    resize() { sized = false; },
  };
}

/* ---------------- Sonar Grid (sonar-grid-effect.md) ---------------- */
function createSonarGrid(canvas, host, opts = {}) {
  const o = Object.assign({ spacing: 26, dotRadius: 1.4, baseOpacity: 0.28, pingEvery: 2.4, speed: 260,
    ringWidth: 90, amplitude: 2.2, maxRings: 6, pingArea: [0.15, 0.2, 0.85, 0.8], color: "#BEF202" }, opts);
  const ctx = canvas.getContext("2d");
  const TAU = Math.PI * 2;
  let width = 0, height = 0, raf = 0, running = false, nextPing = 0, rings = [];

  const addRing = (x, y, born) => { rings.push({ x, y, born }); while (rings.length > o.maxRings) rings.shift(); };
  const draw = (now) => {
    const lifetime = (Math.hypot(width, height) + o.ringWidth) / o.speed;
    rings = rings.filter((r) => (now - r.born) / 1000 < lifetime);
    const live = rings.map((r) => {
      const age = (now - r.born) / 1000, radius = age * o.speed;
      return { x: r.x, y: r.y, radius, reach: radius + o.ringWidth, fade: 1 - age / lifetime };
    });
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = o.color;
    const cols = Math.ceil(width / o.spacing) + 1, rows = Math.ceil(height / o.spacing) + 1;
    const offX = (width - (cols - 1) * o.spacing) / 2, offY = (height - (rows - 1) * o.spacing) / 2;
    const hot = [];
    ctx.globalAlpha = o.baseOpacity;
    ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      const cx = offX + i * o.spacing;
      for (let j = 0; j < rows; j++) {
        const cy = offY + j * o.spacing;
        let energy = 0;
        for (const r of live) {
          if (Math.abs(cx - r.x) > r.reach || Math.abs(cy - r.y) > r.reach) continue;
          const dist = Math.abs(Math.hypot(cx - r.x, cy - r.y) - r.radius);
          if (dist >= o.ringWidth) continue;
          const t = 1 - dist / o.ringWidth, k = t * t * (3 - 2 * t) * r.fade;
          if (k > energy) energy = k;
        }
        if (energy < 0.01) { ctx.moveTo(cx + o.dotRadius, cy); ctx.arc(cx, cy, o.dotRadius, 0, TAU); }
        else hot.push(cx, cy, energy);
      }
    }
    ctx.fill();
    for (let k = 0; k < hot.length; k += 3) {
      const e = hot[k + 2];
      ctx.globalAlpha = o.baseOpacity + (1 - o.baseOpacity) * e;
      ctx.beginPath(); ctx.arc(hot[k], hot[k + 1], o.dotRadius * (1 + o.amplitude * e), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };
  const resize = () => {
    width = Math.max(1, Math.round(host.clientWidth)); height = Math.max(1, Math.round(host.clientHeight));
    const dpr = DPR();
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const randomPing = (now) => {
    const [x0, y0, x1, y1] = o.pingArea;
    addRing(width * (x0 + Math.random() * (x1 - x0)), height * (y0 + Math.random() * (y1 - y0)), now);
  };
  const tick = (now) => {
    if (!running) return;
    if (now >= nextPing) { randomPing(now); nextPing = now + o.pingEvery * 1000; }
    draw(now);
    raf = requestAnimationFrame(tick);
  };
  host.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, .flip")) return;
    const r = host.getBoundingClientRect();
    addRing(e.clientX - r.left, e.clientY - r.top, performance.now());
  });
  let sized = false;
  return {
    start() {
      if (!sized) { resize(); sized = true; }
      const now = performance.now();
      if (reduceMotion) { rings = []; draw(now); return; }
      if (!rings.length) { const [x0, y0, x1, y1] = o.pingArea; addRing(width * (x0 + (x1 - x0) * 0.68), height * (y0 + (y1 - y0) * 0.34), now - 500); }
      nextPing = now + o.pingEvery * 1000;
      running = true; if (!raf) raf = requestAnimationFrame(tick);
    },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    resize() { sized = false; },
  };
}

/* ---------------- Statistik halqalar va hisoblagichlar ---------------- */
function runStats(slide, on) {
  slide.querySelectorAll(".ring__fg").forEach((c) => {
    const C = 2 * Math.PI * 52;
    c.style.strokeDashoffset = on ? C * (1 - parseFloat(c.dataset.pct) / 100) : C;
  });
  slide.querySelectorAll("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
    cancelAnimationFrame(el._raf);
    if (!on) { el.textContent = (0).toFixed(dec); return; }
    const t0 = performance.now() + 600, dur = 2000;
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - t, 3);
      el.textContent = (end * e).toFixed(dec).replace(".", ",");
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  });
}

/* ---------------- 3D CoverFlow (prompt.md) ---------------- */
const COVER_ITEMS = [
  { tag: "#Moliya", t1: "Imtiyozli kreditlar", t2: "– Arzon resurs", big: "💳", accent: "#bef202",
    art: "linear-gradient(160deg,#365314,#070a03 55%,#134e4a)",
    desc: "Bank kreditlari bo‘yicha foizning bir qismini davlat qoplaydi yoki maxsus jamg‘armalar orqali imtiyozli resurs ajratiladi." },
  { tag: "#Kafolat", t1: "Kredit kafilligi", t2: "– Garov muammosiga yechim", big: "🛡️", accent: "#5eead4",
    art: "linear-gradient(160deg,#134e4a,#03100e 55%,#1e3a8a)",
    desc: "Tadbirkorning garovi yetishmaganda davlat jamg‘armasi kredit summasining bir qismiga kafillik beradi." },
  { tag: "#Infratuzilma", t1: "Kichik sanoat zonalari", t2: "– Tayyor maydon", big: "🏭", accent: "#fdba74",
    art: "linear-gradient(160deg,#7c2d12,#120703 55%,#365314)",
    desc: "Foydalanilmayotgan obyekt va yer maydonlari ishlab chiqarish uchun tadbirkorlarga imtiyozli shartlarda beriladi." },
  { tag: "#Innovatsiya", t1: "Texnoparklar", t2: "– IT Park va inkubatorlar", big: "🚀", accent: "#c4b5fd",
    art: "linear-gradient(160deg,#4c1d95,#0b0614 55%,#134e4a)",
    desc: "Rezidentlar uchun soliq imtiyozlari, ofis maydoni, mentorlik va investorlar bilan uchrashuvlar." },
  { tag: "#Ijtimoiy", t1: "Oilaviy tadbirkorlik", t2: "– Har bir oila", big: "🏡", accent: "#fde047",
    art: "linear-gradient(160deg,#713f12,#0f0a02 55%,#365314)",
    desc: "Oilaviy tadbirkorlikni rivojlantirish dasturlari doirasida aholiga mikrokreditlar va o‘qitish." },
  { tag: "#Bozor", t1: "Davlat xaridlari", t2: "– Barqaror talab", big: "🏛️", accent: "#93c5fd",
    art: "linear-gradient(160deg,#1e3a8a,#03060f 55%,#3f6212)",
    desc: "Kichik biznesning davlat xaridlarida ishtirokini kengaytirish orqali ularning mahsulotiga talab yaratiladi." },
];
function createCoverflow(root, ambient, items) {
  const stage = root.querySelector(".cf-stage");
  const dotsEl = root.querySelector(".cf-dots");
  const total = items.length;
  let current = 0, timer = 0, hovered = false, running = false;

  const cards = items.map((it, idx) => {
    const el = document.createElement("div");
    el.className = "cf-card";
    el.style.setProperty("--art", it.art);
    el.style.setProperty("--accent", it.accent);
    el.style.setProperty("--glow", it.accent + "55");
    el.innerHTML = `<div class="cf-card__art" data-big="${it.big}"></div>
      <div class="cf-card__body"><span class="cf-tag">${it.tag}</span>
      <div class="cf-card__text"><h3>${it.t1}</h3><h4>${it.t2}</h4><p>${it.desc}</p></div></div>`;
    el.addEventListener("click", () => go(idx));
    stage.appendChild(el);
    const d = document.createElement("button");
    d.setAttribute("aria-label", it.t1);
    d.addEventListener("click", () => go(idx));
    dotsEl.appendChild(d);
    return el;
  });
  const layout = () => {
    const k = Math.min(1, window.innerWidth / 1200);
    cards.forEach((el, idx) => {
      const off = (idx - current + total) % total;
      let tf = "translateX(0) scale(0.4)", op = 0, z = 0, f = "brightness(0.4) blur(2px)";
      if (off === 0) { tf = "translateX(0) scale(1) rotateY(0)"; op = 1; z = 30; f = "brightness(1)"; }
      else if (off === 1) { tf = `translateX(${285 * k}px) scale(0.84) rotateY(-24deg)`; op = 0.65; z = 20; f = "brightness(0.75)"; }
      else if (off === 2) { tf = `translateX(${510 * k}px) scale(0.68) rotateY(-38deg)`; op = 0.38; z = 10; f = "brightness(0.55) blur(1px)"; }
      else if (off === total - 1) { tf = `translateX(${-285 * k}px) scale(0.84) rotateY(24deg)`; op = 0.65; z = 20; f = "brightness(0.75)"; }
      else if (off === total - 2) { tf = `translateX(${-510 * k}px) scale(0.68) rotateY(38deg)`; op = 0.38; z = 10; f = "brightness(0.55) blur(1px)"; }
      Object.assign(el.style, { transform: tf, opacity: op, zIndex: z, filter: f });
      el.classList.toggle("is-center", off === 0);
    });
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("is-on", i === current));
    ambient.style.background = items[current].art;
  };
  const go = (i) => { current = (i + total) % total; layout(); restart(); };
  const restart = () => { clearInterval(timer); if (running && !hovered && !reduceMotion) timer = setInterval(() => { current = (current + 1) % total; layout(); }, 4500); };
  root.querySelector('[data-cf="prev"]').addEventListener("click", () => go(current - 1));
  root.querySelector('[data-cf="next"]').addEventListener("click", () => go(current + 1));
  root.addEventListener("mouseenter", () => { hovered = true; restart(); });
  root.addEventListener("mouseleave", () => { hovered = false; restart(); });
  let tx = 0;
  stage.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => { const d = e.changedTouches[0].clientX - tx; if (Math.abs(d) > 45) go(current + (d < 0 ? 1 : -1)); });
  layout();
  return { start() { running = true; restart(); }, stop() { running = false; clearInterval(timer); }, resize: layout };
}

/* ---------------- Kuchukcha (mushukcha.mov videosidan) ----------------
   Videodagi 3D kuchukchaning kadrlari chapdan o‘ngga qarash tartibida saqlangan
   (assets/dog/00–23.webp). Kursor qaysi tomonda bo‘lsa, shu tomonga qaragan kadr
   chiziladi; qo‘shni kadrlar o‘zaro aralashtirilib, burilish silliq chiqadi.
   Sichqoncha qimirlamasa, kuchukcha o‘zi u yoq-bu yoqqa qarab turadi. */
function createDog(canvas, count) {
  const ctx = canvas.getContext("2d");
  const frames = Array.from({ length: count }, (_, i) => {
    const im = new Image();
    im.src = `assets/dog/${String(i).padStart(2, "0")}.webp`;
    return im;
  });
  let raf = 0, running = false, t0 = 0, lastMove = -1e9, target = 0.5, cur = 0.5;

  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    target = Math.min(1, Math.max(0, 0.5 + dx * 0.75));
    lastMove = performance.now();
  });

  const resize = () => {
    const dpr = DPR();
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  };
  const ready = (im) => im.complete && im.naturalWidth > 0;

  const frame = (now) => {
    if (!running) return;
    const t = (now - t0) / 1000;
    const idle = t < 3.5 || now - lastMove > 2500;
    const goal = idle ? 0.5 + 0.5 * Math.sin(t * 0.9) : target;
    cur += (goal - cur) * 0.08;

    const f = cur * (count - 1), i = Math.min(count - 2, Math.floor(f)), mix = f - i;
    const A = frames[i], B = frames[i + 1];
    if (ready(A) && ready(B)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(A, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = mix;
      ctx.drawImage(B, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
    raf = requestAnimationFrame(frame);
  };

  return {
    start() { running = true; t0 = performance.now(); resize(); if (!raf) raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; },
    resize,
  };
}

/* ---------------- Deck ---------------- */
(function deck() {
  const slides = [...document.querySelectorAll(".slide")];
  const total = slides.length;
  const bar = document.getElementById("progressBar");
  const cur = document.getElementById("curNum");
  document.getElementById("totalNum").textContent = String(total).padStart(2, "0");
  const dotsEl = document.getElementById("dots");
  let index = -1, lock = false;

  document.querySelectorAll("[data-roll]").forEach(prepareRoll);

  const effects = slides.map((s) => {
    const canvas = s.querySelector(".bg-canvas");
    if (s.dataset.bg === "mesh" && s.hasAttribute("data-dog")) {
      const mesh = createNeonMesh(canvas, s), dog = createDog(s.querySelector(".dog-canvas"), 24);
      return {
        start() { mesh.start(); dog.start(); },
        stop() { mesh.stop(); dog.stop(); },
        resize() { mesh.resize(); dog.resize(); },
      };
    }
    if (s.dataset.bg === "mesh") return createNeonMesh(canvas, s);
    if (s.dataset.bg === "sonar") return createSonarGrid(canvas, s);
    return null;
  });
  const cf = document.getElementById("coverflow");
  if (cf) effects[slides.indexOf(cf.closest(".slide"))] = createCoverflow(cf, document.getElementById("cfAmbient"), COVER_ITEMS);

  document.querySelectorAll(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("is-flipped")));

  slides.forEach((s, i) => {
    const b = document.createElement("button");
    b.innerHTML = `<span>${String(i + 1).padStart(2, "0")} · ${s.dataset.title || ""}</span>`;
    b.setAttribute("aria-label", s.dataset.title || `Slayd ${i + 1}`);
    b.addEventListener("click", () => go(i));
    dotsEl.appendChild(b);
  });

  function go(n) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === index) return;
    const prev = index;
    index = n;
    slides.forEach((s, i) => { s.classList.toggle("is-active", i === n); s.classList.toggle("is-before", i < n); });
    if (prev >= 0) {
      if (effects[prev]) setTimeout(() => prev !== index && effects[prev].stop(), 900);
      runStats(slides[prev], false);
      slides[prev].querySelectorAll(".flip.is-flipped").forEach((f) => f.classList.remove("is-flipped"));
    }
    effects[n] && effects[n].start();
    runStats(slides[n], true);
    slides[n].querySelectorAll("[data-roll]").forEach((el) => setTimeout(() => playRoll(el), +el.dataset.rollDelay || 350));
    slides[n].querySelector(".content").scrollTop = 0;
    [...dotsEl.children].forEach((d, i) => d.classList.toggle("is-on", i === n));
    bar.style.width = `${((n + 1) / total) * 100}%`;
    cur.textContent = String(n + 1).padStart(2, "0");
    history.replaceState(null, "", `#${n + 1}`);
  }
  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  document.getElementById("nextBtn").addEventListener("click", next);
  document.getElementById("prevBtn").addEventListener("click", prev);
  document.getElementById("fsBtn").addEventListener("click", toggleFs);
  document.addEventListener("deck:goto", (e) => go(e.detail));
  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  window.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(total - 1);
    else if (e.key === "f" || e.key === "F") toggleFs();
  });

  window.addEventListener("wheel", (e) => {
    const box = slides[index].querySelector(".content");
    if (box.scrollHeight > box.clientHeight + 4) {
      const atTop = box.scrollTop <= 0, atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
      if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
    }
    if (lock || Math.abs(e.deltaY) < 25) return;
    lock = true; setTimeout(() => (lock = false), 1000);
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  let sx = 0, sy = 0;
  window.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  window.addEventListener("touchend", (e) => {
    if (e.target.closest(".cf-stage")) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) dx < 0 ? next() : prev();
  });

  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      effects.forEach((fx) => fx && fx.resize());
      const fx = effects[index];
      if (fx) { fx.stop(); fx.start(); }
    }, 150);
  });

  const start = parseInt(location.hash.slice(1), 10);
  go(Number.isFinite(start) ? start - 1 : 0);
})();
