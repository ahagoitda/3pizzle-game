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
    shakeDecay = 0.8;
  }

  function emit(x, y, count, color, opts) {
    var o = opts || {};
    var speedMin = o.speedMin || 60;
    var speedMax = o.speedMax || 160;
    var lifeMin = o.lifeMin || 0.3;
    var lifeMax = o.lifeMax || 0.8;
    var sizeMin = o.sizeMin || 2;
    var sizeMax = o.sizeMax || 5;
    var angleMin = o.angleMin || 0;
    var angleMax = o.angleMax || Math.PI * 2;
    var gravity = o.gravity || 0;

    for (var i = 0; i < count; i++) {
      if (poolSize < 200) {
        var angle = rand(angleMin, angleMax);
        var speed = rand(speedMin, speedMax);
        var life = rand(lifeMin, lifeMax);
        particles.push({
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - rand(0, 40),
          life: life,
          maxLife: life,
          color: color,
          size: rand(sizeMin, sizeMax),
          gravity: gravity
        });
        poolSize++;
      }
    }
  }

  function emitLine(x1, y1, x2, y2, count, color, opts) {
    for (var i = 0; i < count; i++) {
      var t = i / (count - 1);
      emit(lerp(x1, x2, t), lerp(y1, y2, t), 1, color, opts);
    }
  }

  function update(dt) {
    var alive = [];
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life > 0) {
        alive.push(p);
      }
    }
    particles = alive;
    poolSize = alive.length;

    if (shakeIntensity > 0.1) {
      shakeIntensity *= shakeDecay;
    } else {
      shakeIntensity = 0;
    }
  }

  function render(ctx) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
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
