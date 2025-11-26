// main.js
// Advanced, refactored single-file game engine with high-quality enemy/boss visuals.
// Requires: <canvas id="gameCanvas" width="900" height="600"></canvas>

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // ---------- Config ----------
  const CONFIG = {
    width: canvas.width,
    height: canvas.height,
    maxPower: 5,
    powerDropRate: 0.08,
    healthDropRate: 0.1,
    healthRecoverAmount: 1,
    enemyShootChance: 0.015,
    bossShootChance: 0.02,
    baseEnemyCount: 10,
    stageDisplayMs: 1500
  };

  // ---------- Utility ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => Date.now();

  // ---------- Base Entity ----------
  class Entity {
    constructor(x = 0, y = 0, w = 10, h = 10) {
      this.x = x; this.y = y; this.w = w; this.h = h;
      this.vx = 0; this.vy = 0;
      this.dead = false;
    }
    get cx() { return this.x + this.w/2; }
    get cy() { return this.y + this.h/2; }
    intersects(other) {
      return this.x < other.x + other.w &&
             this.x + this.w > other.x &&
             this.y < other.y + other.h &&
             this.y + this.h > other.y;
    }
    update(dt) {}
    draw() {}
  }

  // ---------- Player ----------
  class Player extends Entity {
    constructor() {
      super(CONFIG.width/2 - 20, CONFIG.height - 80, 40, 40);
      this.speed = 350; // px/sec
      this.health = 10;
      this.maxHealth = 10;
      this.power = 1;
      this.fireCooldown = 0;
      this.fireRate = 0.35; // seconds
    }
    move(dx, dy, dt) {
      this.x += dx * this.speed * dt;
      this.y += dy * this.speed * dt;
      this.x = clamp(this.x, 0, CONFIG.width - this.w);
      this.y = clamp(this.y, 0, CONFIG.height - this.h);
    }
    canFire() {
      return this.fireCooldown <= 0;
    }
    fire() {
      this.fireCooldown = this.fireRate;
    }
    update(dt) {
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
    }
    draw() {
      // ship shape with gradient + outline (cyber-mech look)
      const gx = this.x, gy = this.y, gw = this.w, gh = this.h;
      ctx.save();
      // glow
      ctx.shadowBlur = 16;
      ctx.shadowColor = '#00ffd2';
      const grad = ctx.createLinearGradient(gx, gy, gx+gw, gy+gh);
      grad.addColorStop(0, '#00ffe6');
      grad.addColorStop(1, '#0056ff');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(gx + gw*0.5, gy);
      ctx.lineTo(gx, gy + gh);
      ctx.lineTo(gx+gw*0.3, gy + gh*0.6);
      ctx.lineTo(gx+gw*0.7, gy + gh*0.6);
      ctx.lineTo(gx+gw, gy + gh);
      ctx.closePath();
      ctx.fill();
      // inner detail
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------- Bullet ----------
  class Bullet extends Entity {
    constructor(x,y,dx,dy, speed=600, size=6, friendly=true) {
      super(x - size/2, y - size/2, size, size);
      const mag = Math.sqrt(dx*dx + dy*dy) || 1;
      this.vx = dx/mag * speed;
      this.vy = dy/mag * speed;
      this.friendly = friendly;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.x < -50 || this.x > CONFIG.width + 50 || this.y < -50 || this.y > CONFIG.height + 50) {
        this.dead = true;
      }
    }
    draw() {
      ctx.save();
      if (this.friendly) {
        ctx.fillStyle = '#fff28a';
        ctx.shadowBlur = 10; ctx.shadowColor = '#ffd54a';
      } else {
        ctx.fillStyle = '#ff8a6b';
        ctx.shadowBlur = 8; ctx.shadowColor = '#ff6b6b';
      }
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, this.w/2, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- PowerUp ----------
  class PowerUp extends Entity {
    constructor(x,y) {
      super(x-10,y-10,20,20);
      this.type = 'power';
      this.speed = 70;
    }
    update(dt) {
      this.y += this.speed * dt;
      if (this.y > CONFIG.height + 50) this.dead = true;
    }
    draw() {
      ctx.save();
      ctx.fillStyle = '#00ffe6';
      ctx.shadowBlur = 12; ctx.shadowColor = '#00ffe6';
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- Health Item ----------
  class HealthItem extends Entity {
    constructor(x,y) {
      super(x-10,y-10,20,20);
      this.speed = 55;
    }
    update(dt) {
      this.y += this.speed * dt;
      if (this.y > CONFIG.height + 50) this.dead = true;
    }
    draw() {
      // draw small heart with gradient
      ctx.save();
      ctx.translate(this.x + 10, this.y + 10);
      const g = ctx.createRadialGradient(0,6,2,0,6,14);
      g.addColorStop(0,'#fff');
      g.addColorStop(0.3,'#ffb3b3');
      g.addColorStop(1,'#ff0000');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0,6);
      ctx.bezierCurveTo(0,-4,-10,-4,-10,6);
      ctx.bezierCurveTo(-10,16,0,20,0,26);
      ctx.bezierCurveTo(0,20,10,16,10,6);
      ctx.bezierCurveTo(10,-4,0,-4,0,6);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------- Enemy (cyber-mech orb) ----------
  class Enemy extends Entity {
    constructor(x,y) {
      super(x,y,40,40);
      // steering
      this.speed = 30 + Math.random() * 40;
      this.randomDir = {x: rand(-1,1), y: rand(-0.3,0.3)};
      this.changeUntil = now() + rand(400,1400);
      this.health = 1;
      this.size = 18;
    }
    update(dt) {
      if (now() > this.changeUntil) {
        this.randomDir = {x: rand(-1,1), y: rand(-0.6,0.6)};
        this.changeUntil = now() + rand(400,1400);
      }
      // weak attraction to player but mostly random
      const dx = (Game.player.cx - this.cx);
      const dy = (Game.player.cy - this.cy);
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const tx = dx/dist * 0.12;
      const ty = dy/dist * 0.12;
      const mix = 0.06;
      const fx = (this.randomDir.x*(1-mix) + tx*mix);
      const fy = (this.randomDir.y*(1-mix) + ty*mix);
      const fl = Math.sqrt(fx*fx + fy*fy) || 1;
      this.x += fx/fl * this.speed * dt;
      this.y += fy/fl * this.speed * dt;

      // keep bounds
      this.x = clamp(this.x, 0, CONFIG.width - this.w);
      this.y = clamp(this.y, 20, CONFIG.height - 120);

      // possible shoot
      if (Math.random() < CONFIG.enemyShootChance) {
        Game.spawnEnemyBullet(this.cx, this.y + this.h/2);
      }
    }
    draw() {
      // glow + orb + core rotating rings (cyber)
      const cx = this.cx, cy = this.cy, r = this.w/2;
      ctx.save();
      // outer glow
      ctx.shadowBlur = 20; ctx.shadowColor = 'rgba(255,60,60,0.9)';
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      g.addColorStop(0, '#ff9b9b'); g.addColorStop(0.6, '#ff6666'); g.addColorStop(1, '#3a0000');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx,cy, r,0,Math.PI*2); ctx.fill();

      // inner metallic shell
      ctx.shadowBlur = 0;
      const body = ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 2, cx, cy, r);
      body.addColorStop(0,'#fff6f6'); body.addColorStop(0.5,'#ff4444'); body.addColorStop(1,'#660000');
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(cx,cy, r*0.78,0,Math.PI*2); ctx.fill();

      // core
      const core = ctx.createRadialGradient(cx, cy, 1, cx, cy, r*0.35);
      core.addColorStop(0,'#fff'); core.addColorStop(1,'#ff0000');
      ctx.fillStyle = core;
      ctx.beginPath(); ctx.arc(cx,cy, r*0.28,0,Math.PI*2); ctx.fill();

      // mechanical seam
      ctx.strokeStyle = 'rgba(255,200,200,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx - r*0.6, cy); ctx.lineTo(cx + r*0.6, cy); ctx.stroke();

      ctx.restore();
    }
  }

  // ---------- Boss (cyber-mech flagship) ----------
  class Boss extends Entity {
    constructor(x,y) {
      super(x,y,160,100);
      this.health = 80 + GameState.level * 20;
      this.direction = 1;
      this.shootTimer = 0;
      this.phase = 1;
      this.phaseChangeHp = Math.max(1, Math.floor(this.health * 0.5));
      this.ringRot = 0;
    }
    update(dt) {
      this.x += this.direction * 80 * dt;
      if (this.x <= 20 || this.x + this.w >= CONFIG.width - 20) this.direction *= -1;

      // phase change
      if (this.health <= this.phaseChangeHp && this.phase === 1) {
        this.phase = 2;
        this.shootTimer = 0;
      }

      // shooting patterns depending on phase
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        if (this.phase === 1) {
          this.shootPatternA();
          this.shootTimer = 1.1;
        } else {
          this.shootPatternB();
          this.shootTimer = 0.55;
        }
      }

      this.ringRot += dt * 1.2;
    }
    shootPatternA() {
      // 5 bullets spread
      const cx = this.cx, cy = this.y + this.h;
      for (let i = -2; i <= 2; i++) {
        const angle = (i * 12) * (Math.PI/180);
        const dx = Math.sin(angle), dy = Math.cos(angle);
        Game.spawnEnemyBullet(cx + i*6, cy, dx, dy, 240, 6, false);
      }
    }
    shootPatternB() {
      // ring burst + homing shot
      const cx = this.cx, cy = this.y + this.h;
      // ring
      const n = 10;
      for (let i = 0; i < n; i++) {
        const angle = (i / n) * Math.PI * 2 + this.ringRot;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        Game.spawnEnemyBullet(cx + dx * 10, cy + dy * 10, dx, dy, 180, 6, false);
      }
      // homing toward player
      const pdx = Game.player.cx - cx, pdy = Game.player.cy - cy;
      Game.spawnEnemyBullet(cx, cy, pdx, pdy, 300, 8, false);
    }
    draw() {
      ctx.save();
      // glow orb behind
      const cx = this.cx, cy = this.cy;
      ctx.shadowBlur = 40; ctx.shadowColor = '#cc66ff';
      ctx.fillStyle = 'rgba(220,120,255,0.08)';
      ctx.beginPath(); ctx.arc(cx, cy, this.w, 0, Math.PI*2); ctx.fill();

      // body gradient
      ctx.shadowBlur = 0;
      const body = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.h);
      body.addColorStop(0, '#ff88ff'); body.addColorStop(0.6, '#aa00ff'); body.addColorStop(1, '#3a0055');
      ctx.fillStyle = body;
      roundRect(ctx, this.x, this.y, this.w, this.h, 12, true, false);

      // outer strokes
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3;
      ctx.strokeRect(this.x, this.y, this.w, this.h);

      // central core
      const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 40);
      coreGrad.addColorStop(0, '#ffffff'); coreGrad.addColorStop(0.5, '#ff77ff'); coreGrad.addColorStop(1, '#660055');
      ctx.fillStyle = coreGrad;
      ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI*2); ctx.fill();

      // rotating rings
      ctx.strokeStyle = 'rgba(255,200,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 54, this.ringRot, this.ringRot + Math.PI*1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 70, -this.ringRot*0.7, -this.ringRot*0.7 + Math.PI*0.9);
      ctx.stroke();

      // panel lines
      ctx.strokeStyle = 'rgba(255,200,255,0.18)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x + 12, this.y + 18); ctx.lineTo(this.x + this.w - 12, this.y + 18);
      ctx.moveTo(this.x + 12, this.y + this.h - 18); ctx.lineTo(this.x + this.w - 12, this.y + this.h - 18);
      ctx.stroke();

      ctx.restore();
    }
  }

  // helper for rounded rect
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (r === undefined) r = 5;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ---------- GameState & Manager ----------
  const GameState = {
    running: false,
    level: 1,
    score: 0,
    maxTime: 120,
    startTime: 0,
    stageDisplayAt: 0,
    bossWarning: false,
    bossWarningStart: 0
  };

  const Game = {
    player: new Player(),
    bullets: [],
    enemies: [],
    enemyBullets: [],
    powerUps: [],
    healthItems: [],
    boss: null,

    spawnEnemy(x,y) { this.enemies.push(new Enemy(x,y)); },

    spawnInitialEnemies(level) {
      this.enemies.length = 0;
      const count = CONFIG.baseEnemyCount + (level-1)*2;
      for (let i=0;i<count;i++){
        const x = rand(40, CONFIG.width - 80);
        const y = rand(40, CONFIG.height/2 - 40);
        this.spawnEnemy(x,y);
      }
    },

    spawnPlayerBullets() {
      const p = this.player;
      const centerX = p.cx, topY = p.y;
      const multi = p.power;
      const spread = 10 * (multi - 1);
      for (let i=0;i<multi;i++){
        const offset = (i - (multi-1)/2) * (spread / Math.max(1,multi-1));
        const bx = centerX + offset;
        this.bullets.push(new Bullet(bx, topY, 0, -1, 920, 8, true));
      }
    },

    spawnEnemyBullet(x, y, dx=0, dy=1, speed=230, size=6, friendly=false) {
      this.enemyBullets.push(new Bullet(x, y, dx, dy, speed, size, friendly));
    },

    spawnPower(x,y) {
      this.powerUps.push(new PowerUp(x,y));
    },

    spawnHealth(x,y) {
      this.healthItems.push(new HealthItem(x,y));
    },

    update(dt) {
      // update player
      this.player.update(dt);

      // bullets
      for (let i = this.bullets.length -1; i>=0; i--){
        const b = this.bullets[i];
        b.update(dt);
        if (b.dead) { this.bullets.splice(i,1); continue; }
        // collide enemies
        for (let j = this.enemies.length -1; j>=0; j--){
          const e = this.enemies[j];
          if (b.intersects(e) && b.friendly){
            e.health -= 1;
            b.dead = true;
            if (e.health <= 0) {
              // drop logic
              GameState.score += 10;
              // power
              if (Math.random() < CONFIG.powerDropRate) this.spawnPower(e.cx, e.cy);
              if (Math.random() < CONFIG.healthDropRate) this.spawnHealth(e.cx, e.cy);
              this.enemies.splice(j,1);
            }
            break;
          }
        }
        // boss hit
        if (!b.dead && this.boss && b.friendly && b.intersects(this.boss)) {
          this.boss.health -= 1;
          b.dead = true;
          if (this.boss.health <= 0) {
            GameState.score += 200;
            this.boss = null;
          }
        }
      }

      // enemy bullets
      for (let i = this.enemyBullets.length -1; i>=0; i--){
        const b = this.enemyBullets[i];
        b.update(dt);
        if (b.dead) { this.enemyBullets.splice(i,1); continue; }
        if (b.intersects(this.player) && !b.friendly) {
          this.player.health -= 1;
          this.enemyBullets.splice(i,1);
        }
      }

      // enemies
      for (let i = this.enemies.length -1; i>=0; i--){
        this.enemies[i].update(dt);
      }

      // boss
      if (this.boss) this.boss.update(dt);

      // powerups
      for (let i = this.powerUps.length -1; i>=0; i--){
        const p = this.powerUps[i];
        p.update(dt);
        if (p.dead) { this.powerUps.splice(i,1); continue; }
        if (p.intersects(this.player)) {
          this.powerUps.splice(i,1);
          this.player.power = Math.min(CONFIG.maxPower, this.player.power + 1);
        }
      }

      // health items
      for (let i = this.healthItems.length -1; i>=0; i--){
        const h = this.healthItems[i];
        h.update(dt);
        if (h.dead) { this.healthItems.splice(i,1); continue; }
        if (h.intersects(this.player)) {
          this.healthItems.splice(i,1);
          this.player.health = Math.min(this.player.maxHealth, this.player.health + CONFIG.healthRecoverAmount);
        }
      }

      // remove dead bullets
      for (let i = this.bullets.length -1; i>=0; i--) if (this.bullets[i].dead) this.bullets.splice(i,1);
      for (let i = this.enemyBullets.length -1; i>=0; i--) if (this.enemyBullets[i].dead) this.enemyBullets.splice(i,1);
    },

    draw() {
      // player
      this.player.draw();
      // bullets
      this.bullets.forEach(b => b.draw());
      this.enemyBullets.forEach(b => b.draw());
      // enemies
      this.enemies.forEach(e => e.draw());
      // boss
      if (this.boss) this.boss.draw();
      // powerups & health
      this.powerUps.forEach(p => p.draw());
      this.healthItems.forEach(h => h.draw());
    }
  };

  // ---------- Input handling ----------
  const input = {
    left: false, right: false, up: false, down: false, fire: false
  };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') input.left = true;
    if (e.key === 'ArrowRight') input.right = true;
    if (e.key === 'ArrowUp') input.up = true;
    if (e.key === 'ArrowDown') input.down = true;
    if (e.key === ' ') input.fire = true;
    if (e.key === 'Enter') {
      if (!GameState.running) startGame();
      else if (GameState.running && GameState.gameOver) startGame(); // restart
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') input.left = false;
    if (e.key === 'ArrowRight') input.right = false;
    if (e.key === 'ArrowUp') input.up = false;
    if (e.key === 'ArrowDown') input.down = false;
    if (e.key === ' ') input.fire = false;
  });

  // ---------- HUD & screens ----------
  function drawStartScreen() {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE INVADERS - CYBER MECH', CONFIG.width/2, CONFIG.height/2 - 40);
    ctx.font = '20px Inter, Arial';
    ctx.fillText('Press ENTER to Start', CONFIG.width/2, CONFIG.height/2 + 10);
    ctx.restore();
  }

  function drawGameOver() {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = '48px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CONFIG.width/2, CONFIG.height/2 - 20);
    ctx.font = '22px Inter, Arial';
    ctx.fillText(`Score: ${GameState.score}`, CONFIG.width/2, CONFIG.height/2 + 20);
    ctx.fillText('Press ENTER to Restart', CONFIG.width/2, CONFIG.height/2 + 60);
    ctx.restore();
  }

  function drawHUD() {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.font = '18px Inter, Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${GameState.score}`, 12, 22);
    ctx.fillText(`HP: ${Game.player.health}`, 12, 44);
    const tleft = Math.max(0, GameState.maxTime - Math.floor((now() - GameState.startTime)/1000));
    ctx.fillText(`Time: ${tleft}`, 12, 66);
    ctx.fillText(`Level: ${GameState.level}`, 12, 88);
    ctx.fillText(`Power: ${Game.player.power}/${CONFIG.maxPower}`, 12, 110);
    ctx.restore();
  }

  function drawCenterLevelText() {
    const elapsed = now() - GameState.stageDisplayAt;
    if (GameState.stageDisplayAt && elapsed < CONFIG.stageDisplayMs) {
      const t = elapsed / CONFIG.stageDisplayMs;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = '#fff';
      ctx.font = '56px Inter, Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`LEVEL ${GameState.level}`, CONFIG.width/2, CONFIG.height/2);
      ctx.restore();
    }
  }

  // ---------- Game flow ----------
  function startGame() {
    GameState.running = true;
    GameState.level = 1;
    GameState.score = 0;
    GameState.startTime = now();
    GameState.stageDisplayAt = now();
    Game.player = new Player();
    Game.bullets = []; Game.enemyBullets = []; Game.powerUps = []; Game.healthItems = [];
    Game.spawnInitialEnemies(GameState.level);
    Game.boss = null;
    GameState.bossWarning = false;
    GameState.gameOver = false;
  }

  function nextStage() {
    GameState.level++;
    GameState.stageDisplayAt = now();
    if (GameState.level % 3 === 0) {
      // spawn boss with windup
      GameState.bossWarning = true;
      GameState.bossWarningStart = now();
      setTimeout(() => {
        GameState.bossWarning = false;
        Game.boss = new Boss(CONFIG.width/2 - 80, 60);
      }, 1400);
    } else {
      Game.spawnInitialEnemies(GameState.level);
    }
  }

  // ---------- Main loop ----------
let lastTime = now();
function loop() {
  const t = now();
  const dt = (t - lastTime) / 1000;
  lastTime = t;

  // clear
  ctx.clearRect(0,0,CONFIG.width, CONFIG.height);

  if (!GameState.running) {
    // 게임이 시작되지 않은 상태이면 시작 화면
    drawStartScreen();
    requestAnimationFrame(loop);
    return;
  }

  // handle input / movement
  let mvx = 0, mvy = 0;
  if (input.left) mvx -= 1;
  if (input.right) mvx += 1;
  if (input.up) mvy -= 1;
  if (input.down) mvy += 1;
  if (mvx !== 0 && mvy !== 0) {
    const inv = 1/Math.sqrt(2);
    mvx *= inv; mvy *= inv;
  }
  Game.player.move(mvx, mvy, dt);

  // firing
  if (input.fire && Game.player.canFire()) {
    Game.spawnPlayerBullets();
    Game.player.fire();
  }
  Game.player.update(dt);

  // update game objects
  Game.update(dt);

  // ---------- HP 체크: 0 이하이면 게임오버 ----------
  if (Game.player.health <= 0) {
    GameState.running = false;
    GameState.gameOver = true;
  }

  // stage / time checks
  const timeLeft = Math.max(0, GameState.maxTime - Math.floor((now() - GameState.startTime)/1000));
  if (timeLeft <= 0) {
    GameState.running = false;
    GameState.gameOver = true;
  }

  // check stage clear
  if (Game.enemies.length === 0 && !Game.boss) {
    if (now() - GameState.stageDisplayAt > 200) {
      nextStage();
    }
  }

  // draw everything
  Game.draw();

  // overlay boss warning if needed
  if (GameState.bossWarning) {
    const blink = (Math.floor((now() - GameState.bossWarningStart) / 200) % 2) === 0;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,CONFIG.width, CONFIG.height);
    ctx.fillStyle = blink ? '#ff0055' : '#ffff66';
    ctx.font = '64px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ BOSS INCOMING ⚠', CONFIG.width/2, CONFIG.height/2 - 20);
    ctx.restore();
  }

  // HUD
  drawHUD();
  drawCenterLevelText();

  // ---------- Game Over 화면 ----------
  if (GameState.gameOver) {
    drawGameOver();
  }

  // request next frame
  requestAnimationFrame(loop);
}


  // ---------- Initialize ----------
  // Put initial assets
  Game.spawnInitialEnemies(1);
  GameState.stageDisplayAt = now();

  // start loop
  requestAnimationFrame(loop);

  // expose Game to console for debugging
  window._GAME = { Game, GameState };

})();
