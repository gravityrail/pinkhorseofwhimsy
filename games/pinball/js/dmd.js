/**
 * Dot-matrix display (DMD) — canvas texture with animated callouts.
 */

export class DMD {
  constructor(width = 512, height = 160) {
    this.w = width;
    this.h = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = null; // set after THREE loads

    this.score = 0;
    this.displayScore = 0;
    this.balls = 0;
    this.multiplier = 1;
    this.modeLabel = '';
    this.highScores = this._loadHighs();

    /** @type {{text:string, life:number, max:number, color:string, scale:number}[]} */
    this.popups = [];
    /** @type {{text:string, life:number, max:number, color:string} | null} */
    this.banner = null;
    this.flash = 0;
    this.t = 0;
    this.attract = true;
    this.pinkMode = false;
  }

  attachTexture(THREE) {
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    return this.texture;
  }

  _loadHighs() {
    try {
      const raw = localStorage.getItem('phw-pinball-highs');
      if (raw) return JSON.parse(raw).slice(0, 5);
    } catch (_) {}
    return [500000, 250000, 100000, 50000, 10000];
  }

  saveHigh(score) {
    this.highScores.push(score);
    this.highScores.sort((a, b) => b - a);
    this.highScores = this.highScores.slice(0, 5);
    try {
      localStorage.setItem('phw-pinball-highs', JSON.stringify(this.highScores));
    } catch (_) {}
  }

  setScore(n) {
    this.score = n;
  }

  setBalls(n) {
    this.balls = n;
  }

  setMultiplier(n) {
    this.multiplier = n;
  }

  setMode(label) {
    this.modeLabel = label || '';
  }

  setAttract(on) {
    this.attract = on;
  }

  setPink(on) {
    this.pinkMode = on;
  }

  /** Big centered banner: HURRY UP, MULTIBALL, etc. */
  showBanner(text, duration = 2.2, color = '#ffee55') {
    this.banner = { text, life: duration, max: duration, color };
    this.flash = 0.35;
  }

  /** Floating score pop */
  pop(text, color = '#7CFF6B') {
    this.popups.push({
      text: String(text),
      life: 1.1,
      max: 1.1,
      color,
      scale: 1 + Math.random() * 0.15,
      x: 0.35 + Math.random() * 0.3,
    });
    if (this.popups.length > 6) this.popups.shift();
  }

  update(dt) {
    this.t += dt;
    // Score count-up
    const diff = this.score - this.displayScore;
    if (Math.abs(diff) < 1) this.displayScore = this.score;
    else this.displayScore += diff * Math.min(1, dt * 8);

    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    this.flash = Math.max(0, this.flash - dt);
    for (const p of this.popups) p.life -= dt;
    this.popups = this.popups.filter((p) => p.life > 0);
    this.draw();
  }

  draw() {
    const { ctx, w, h } = this;
    const pink = this.pinkMode;

    // CRT-ish background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    if (pink) {
      bg.addColorStop(0, '#2a0020');
      bg.addColorStop(1, '#120018');
    } else {
      bg.addColorStop(0, '#061a12');
      bg.addColorStop(1, '#020806');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Scanline texture
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

    // Glow border
    ctx.strokeStyle = pink ? 'rgba(255,80,200,0.55)' : 'rgba(80,255,160,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.attract && this.score === 0) {
      this._drawAttract(ctx, w, h, pink);
    } else {
      // SCORE label
      ctx.fillStyle = pink ? '#ff9ad8' : '#5dff9a';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('SCORE', w * 0.28, 22);

      ctx.fillStyle = pink ? '#ffd6f0' : '#e8ffe8';
      ctx.font = 'bold 42px "Courier New", monospace';
      ctx.fillText(this._fmt(Math.floor(this.displayScore)), w * 0.28, 58);

      // Balls
      ctx.fillStyle = pink ? '#ff9ad8' : '#5dff9a';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('BALL', w * 0.72, 22);
      ctx.fillStyle = pink ? '#ffd6f0' : '#e8ffe8';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillText(String(this.balls), w * 0.72, 56);

      // Multiplier
      if (this.multiplier > 1) {
        const pulse = 0.7 + 0.3 * Math.sin(this.t * 8);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#ffee55';
        ctx.font = 'bold 22px "Courier New", monospace';
        ctx.fillText(`×${this.multiplier}`, w * 0.88, 56);
        ctx.globalAlpha = 1;
      }

      // Mode strip
      if (this.modeLabel) {
        ctx.fillStyle = pink ? 'rgba(255,40,160,0.35)' : 'rgba(40,200,120,0.28)';
        ctx.fillRect(12, h - 42, w - 24, 28);
        ctx.fillStyle = pink ? '#ffb3e6' : '#a6ffd0';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(this.modeLabel, w / 2, h - 27);
      }
    }

    // Banner overlay
    if (this.banner) {
      const k = this.banner.life / this.banner.max;
      const pop = k > 0.85 ? 1 + (1 - (1 - k) / 0.15) * 0.25 : k < 0.15 ? k / 0.15 : 1;
      ctx.save();
      ctx.translate(w / 2, h * 0.55);
      ctx.scale(pop, pop);
      ctx.shadowColor = this.banner.color;
      ctx.shadowBlur = 24;
      ctx.fillStyle = this.banner.color;
      ctx.font = 'bold 48px Impact, "Arial Black", sans-serif';
      ctx.fillText(this.banner.text, 0, 0);
      ctx.restore();
    }

    // Score pops
    for (const p of this.popups) {
      const a = Math.min(1, p.life * 2) * Math.min(1, (p.max - p.life) * 6 + 0.2);
      const rise = (1 - p.life / p.max) * 40;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.font = `bold ${Math.floor(28 * p.scale)}px "Courier New", monospace`;
      ctx.fillText(p.text, w * p.x, h * 0.72 - rise);
      ctx.globalAlpha = 1;
    }

    // Flash
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,220,${this.flash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.texture) this.texture.needsUpdate = true;
  }

  _drawAttract(ctx, w, h, pink) {
    const blink = Math.sin(this.t * 3) > 0;
    ctx.fillStyle = pink ? '#ff66cc' : '#6dffb0';
    ctx.font = 'bold 36px Impact, "Arial Black", sans-serif';
    ctx.fillText('PINK HORSE PINBALL', w / 2, 40);

    ctx.fillStyle = '#ffee88';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText(blink ? 'INSERT COIN · TAP 1' : '', w / 2, 78);

    ctx.fillStyle = pink ? '#ff9ad8' : '#7dffb8';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('HIGH SCORES', w / 2, 108);
    ctx.font = '13px "Courier New", monospace';
    this.highScores.slice(0, 3).forEach((s, i) => {
      ctx.fillText(`${i + 1}. ${this._fmt(s)}`, w / 2, 128 + i * 16);
    });
  }

  _fmt(n) {
    return n.toLocaleString('en-US');
  }
}
