// ── roundRect 폴리필 ─────────────────────────────────────────────
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
    if (Array.isArray(r)) r = { tl: r[0], tr: r[1], br: r[2], bl: r[3] };
    this.beginPath();
    this.moveTo(x + r.tl, y);
    this.lineTo(x + w - r.tr, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    this.lineTo(x + w, y + h - r.br);
    this.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    this.lineTo(x + r.bl, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    this.lineTo(x, y + r.tl);
    this.quadraticCurveTo(x, y, x + r.tl, y);
    this.closePath();
    return this;
  };
}

// ── Sound 모듈 ────────────────────────────────────────────────────
var Sound = (function () {
  'use strict';

  var actx = null;
  var enabled = true;

  // localStorage에서 사운드 설정 로드
  try {
    var saved = localStorage.getItem('triplePuzzleSound');
    if (saved === 'off') enabled = false;
  } catch (e) {}

  function getCtx() {
    if (!actx) {
      try {
        actx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        actx = null;
      }
    }
    return actx;
  }

  function resume() {
    if (actx && actx.state === 'suspended') {
      actx.resume();
    }
  }

  function play(freq, duration, type, vol, delay) {
    if (!enabled) return;
    var c = getCtx();
    if (!c) return;
    resume();
    try {
      var osc = c.createOscillator();
      var gain = c.createGain();
      var startTime = c.currentTime + (delay || 0);
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(vol || 0.15, startTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + (duration || 0.1));
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(startTime);
      osc.stop(startTime + (duration || 0.1) + 0.01);
    } catch (e) {}
  }

  // 개선된 match 사운드 — 상승하는 두 음
  function match() {
    play(523, 0.08, 'sine', 0.12, 0);
    play(784, 0.12, 'sine', 0.10, 0.07);
  }

  // 콤보 — 콤보 수에 따라 화음 올라감
  function combo(n) {
    var baseFreqs = [392, 440, 494, 523, 587, 659, 698, 784];
    var base = baseFreqs[Math.min(n - 2, baseFreqs.length - 1)];
    play(base, 0.1, 'triangle', 0.12, 0);
    play(base * 1.25, 0.15, 'triangle', 0.10, 0.05);
    play(base * 1.5, 0.2, 'sine', 0.08, 0.12);
  }

  function place() {
    play(660, 0.04, 'square', 0.05, 0);
    play(880, 0.06, 'sine', 0.06, 0.04);
  }

  function clear() {
    play(523, 0.1, 'triangle', 0.12, 0);
    play(659, 0.12, 'triangle', 0.10, 0.07);
    play(784, 0.18, 'sine', 0.12, 0.16);
  }

  function invalid() {
    play(200, 0.08, 'square', 0.06, 0);
    play(160, 0.12, 'square', 0.05, 0.08);
  }

  function gameover() {
    play(440, 0.15, 'sawtooth', 0.08, 0);
    play(370, 0.18, 'sawtooth', 0.07, 0.18);
    play(294, 0.3, 'sawtooth', 0.06, 0.38);
  }

  function win() {
    play(523, 0.1, 'sine', 0.12, 0);
    play(659, 0.1, 'sine', 0.12, 0.1);
    play(784, 0.1, 'sine', 0.12, 0.2);
    play(1047, 0.25, 'sine', 0.15, 0.32);
  }

  function click() {
    play(600, 0.04, 'sine', 0.05, 0);
  }

  // 마작 매치: 전통 타악기 느낌
  function mahjongMatch() {
    play(800, 0.06, 'square', 0.08, 0);
    play(1000, 0.1, 'sine', 0.08, 0.04);
  }

  // 마작 undo
  function undo() {
    play(440, 0.08, 'sine', 0.07, 0);
    play(330, 0.12, 'sine', 0.06, 0.07);
  }

  function setEnabled(v) {
    enabled = v;
    try {
      localStorage.setItem('triplePuzzleSound', v ? 'on' : 'off');
    } catch (e) {}
  }

  function isEnabled() {
    return enabled;
  }

  return {
    match: match,
    combo: combo,
    place: place,
    clear: clear,
    invalid: invalid,
    gameover: gameover,
    win: win,
    click: click,
    mahjongMatch: mahjongMatch,
    undo: undo,
    resume: resume,
    play: play,
    enabled: setEnabled,
    isEnabled: isEnabled
  };
})();

// ── Effects 모듈 ──────────────────────────────────────────────────
const Effects = (function () {
  'use strict';

  var particles;
  var poolSize;
  var shakeIntensity;
  var shakeDecay;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function reset() {
    particles = [];
    poolSize = 0;
    shakeIntensity = 0;
    shakeDecay = 0.82;
  }

  // opts.shape: 'circle'(기본) | 'square' | 'star' | 'ring'
  function emit(x, y, count, color, opts) {
    var o = opts || {};
    var speedMin = o.speedMin || 60;
    var speedMax = o.speedMax || 160;
    var lifeMin  = o.lifeMin  || 0.3;
    var lifeMax  = o.lifeMax  || 0.8;
    var sizeMin  = o.sizeMin  || 2;
    var sizeMax  = o.sizeMax  || 5;
    var angleMin = o.angleMin !== undefined ? o.angleMin : 0;
    var angleMax = o.angleMax !== undefined ? o.angleMax : Math.PI * 2;
    var gravity  = o.gravity  || 80;
    var shape    = o.shape    || 'circle';
    var shapes   = Array.isArray(shape) ? shape : [shape];

    for (var i = 0; i < count; i++) {
      if (poolSize >= 400) break;
      var angle = rand(angleMin, angleMax);
      var speed = rand(speedMin, speedMax);
      var life  = rand(lifeMin, lifeMax);
      var chosenShape = shapes[Math.floor(Math.random() * shapes.length)];
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(0, 30),
        life: life,
        maxLife: life,
        color: color,
        size: rand(sizeMin, sizeMax),
        gravity: gravity,
        shape: chosenShape,
        rot: rand(0, Math.PI * 2),
        rotV: rand(-4, 4)
      });
      poolSize++;
    }
  }

  function emitLine(x1, y1, x2, y2, count, color, opts) {
    for (var i = 0; i < count; i++) {
      var t = count > 1 ? i / (count - 1) : 0;
      emit(lerp(x1, x2, t), lerp(y1, y2, t), 1, color, opts);
    }
  }

  function update(dt) {
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.rot += p.rotV * dt;
      p.life -= dt;
      if (p.life > 0) alive.push(p);
    }
    particles = alive;
    poolSize  = alive.length;

    if (shakeIntensity > 0.1) {
      shakeIntensity *= shakeDecay;
    } else {
      shakeIntensity = 0;
    }
  }

  function renderParticle(ctx, p) {
    var alpha = Math.max(0, p.life / p.maxLife);
    var s = p.size * alpha;
    if (s <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);

    switch (p.shape) {
      case 'square':
        ctx.fillRect(-s, -s, s * 2, s * 2);
        break;
      case 'star':
        drawStarPath(ctx, 0, 0, s * 0.4, s, 4);
        ctx.fill();
        break;
      case 'ring':
        ctx.lineWidth = Math.max(0.5, s * 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      default: // circle
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, Math.PI * 2);
        ctx.fill();
        break;
    }
    ctx.restore();
  }

  function drawStarPath(ctx, cx, cy, inner, outer, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (i * Math.PI) / points - Math.PI / 2;
      var x = cx + Math.cos(a) * r;
      var y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function render(ctx) {
    for (var i = 0; i < particles.length; i++) {
      renderParticle(ctx, particles[i]);
    }
    ctx.globalAlpha = 1;
  }

  function getShakeOffset() {
    if (shakeIntensity < 0.1) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * shakeIntensity * 2,
      y: (Math.random() - 0.5) * shakeIntensity * 2
    };
  }

  function shake(intensity) {
    shakeIntensity = Math.max(shakeIntensity, intensity || 4);
  }

  reset();

  return {
    emit: emit,
    emitLine: emitLine,
    update: update,
    render: render,
    getShakeOffset: getShakeOffset,
    shake: shake,
    reset: reset
  };
})();