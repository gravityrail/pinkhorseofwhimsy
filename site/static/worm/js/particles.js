/*! Worm — particle & FX helpers */
(function (W) {
  "use strict";

  function Particles() {
    this.list = [];
  }

  Particles.prototype.spawn = function (opts) {
    const n = opts.n || 8;
    const cx = opts.x;
    const cy = opts.y;
    const col = opts.color || "rgba(255,220,100,0.9)";
    const life = opts.life || 500;
    const spread = opts.spread == null ? 1.2 : opts.spread;
    const speed = opts.speed == null ? 0.012 : opts.speed;
    const grav = opts.grav == null ? 0.00002 : opts.grav;
    const size = opts.size == null ? 0.12 : opts.size;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * spread);
      this.list.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        t: 0,
        life: life * (0.6 + Math.random() * 0.6),
        color: col,
        size: size * (0.5 + Math.random()),
        grav: grav,
        spark: !!opts.spark,
      });
    }
  };

  Particles.prototype.burstEat = function (cx, cy, color) {
    this.spawn({
      x: cx,
      y: cy,
      n: 14,
      color: color || "rgba(255,230,120,0.95)",
      life: 480,
      speed: 0.018,
      size: 0.14,
      spark: true,
    });
  };

  Particles.prototype.burstHurt = function (cx, cy) {
    this.spawn({
      x: cx,
      y: cy,
      n: 18,
      color: "rgba(255,80,100,0.9)",
      life: 600,
      speed: 0.022,
      size: 0.16,
      grav: 0.00003,
    });
  };

  Particles.prototype.burstBird = function (cx, cy) {
    this.spawn({
      x: cx,
      y: cy,
      n: 10,
      color: "rgba(200,220,255,0.85)",
      life: 400,
      speed: 0.02,
      size: 0.12,
    });
  };

  Particles.prototype.drip = function (x, y, color) {
    this.list.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.002,
      vy: 0.004 + Math.random() * 0.006,
      t: 0,
      life: 900 + Math.random() * 400,
      color: color || "rgba(80,255,60,0.85)",
      size: 0.1 + Math.random() * 0.08,
      grav: 0.00004,
      spark: false,
    });
  };

  Particles.prototype.update = function (dt) {
    const out = [];
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      out.push(p);
    }
    this.list = out;
  };

  Particles.prototype.draw = function (ctx, cell) {
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      const a = 1 - p.t / p.life;
      const r = p.size * cell * (p.spark ? 0.5 + a * 0.5 : 1);
      const x = p.x * cell + cell / 2;
      const y = p.y * cell + cell / 2;
      ctx.globalAlpha = a;
      if (p.spark) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, cell * 0.04);
        ctx.beginPath();
        ctx.moveTo(x - r, y);
        ctx.lineTo(x + r, y);
        ctx.moveTo(x, y - r);
        ctx.lineTo(x, y + r);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  W.Particles = Particles;
})(window.Worm = window.Worm || {});
