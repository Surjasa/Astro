// ============================================================
// MARS ENVIRONMENT CANVAS ANIMATION
// Self-contained. Renders the animated Mars habitat scene
// onto #habitat-mars-canvas inside the Habitat Survival Console.
// No external dependencies.
// ============================================================

(function MarsCanvasModule() {

  var canvas, ctx, animId;
  var W = 0, H = 0;
  var dustParticles = [];
  var crewFigures  = [];

  // ---- Init ----
  function init() {
    canvas = document.getElementById('habitat-mars-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // Responsive sizing
    resize();
    window.addEventListener('resize', resize);

    // Seed dust particles
    dustParticles = [];
    for (var i = 0; i < 28; i++) {
      dustParticles.push({
        x: Math.random() * 1200,
        y: 60 + Math.random() * 160,
        r: 0.6 + Math.random() * 1.2,
        speed: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        shimmerPhase: Math.random() * Math.PI * 2
      });
    }

    // Crew walking figures
    crewFigures = [
      { x: 180, y: 0, speed: 0.18, dir: 1 },
      { x: 460, y: 0, speed: 0.12, dir: -1 }
    ];

    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function resize() {
    if (!canvas) return;
    var parent = canvas.parentElement;
    if (!parent) return;
    W = parent.clientWidth  || 680;
    H = 220;
    canvas.width  = W;
    canvas.height = H;
  }

  // ---- Main loop ----
  function loop() {
    if (!canvas || !ctx) return;
    var t = Date.now() * 0.001;
    draw(t);
    animId = requestAnimationFrame(loop);
  }

  // ---- Full scene draw ----
  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    drawSky(t);
    drawSun(t);
    drawMountains();
    drawTerrain();
    drawGround();
    drawModules(t);
    drawTubes(t);
    drawCrew(t);
    drawDustParticles(t);
    drawAtmoHaze(t);
  }

  // ---- Sky ----
  function drawSky(t) {
    var grad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    var hueShift = Math.sin(t * 0.05) * 8;
    grad.addColorStop(0,   'hsl(' + (28 + hueShift) + ',55%,52%)');
    grad.addColorStop(0.4, 'hsl(' + (22 + hueShift) + ',48%,44%)');
    grad.addColorStop(1,   'hsl(' + (18 + hueShift) + ',42%,36%)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H * 0.65);
  }

  // ---- Sun ----
  function drawSun(t) {
    var sx = W * 0.78, sy = H * 0.12;
    var pulse = 1 + Math.sin(t * 0.4) * 0.08;
    // outer glow
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 36 * pulse);
    g.addColorStop(0,   'rgba(255,215,0,0.75)');
    g.addColorStop(0.5, 'rgba(255,165,0,0.3)');
    g.addColorStop(1,   'rgba(255,120,0,0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, 36 * pulse, 0, Math.PI * 2);
    ctx.fill();
    // core
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ---- Mountains (distant) ----
  function drawMountains() {
    var hFar = H * 0.42;
    // far range
    ctx.fillStyle = 'rgba(155,78,40,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, hFar);
    zigzag(ctx, 0, W, hFar - H * 0.09, 9, 14);
    ctx.lineTo(W, hFar); ctx.closePath(); ctx.fill();

    // mid range
    ctx.fillStyle = 'rgba(140,65,30,0.55)';
    ctx.beginPath();
    ctx.moveTo(0, hFar + H * 0.04);
    zigzag(ctx, 0, W, hFar - H * 0.04, 7, 10);
    ctx.lineTo(W, hFar + H * 0.04); ctx.closePath(); ctx.fill();
  }

  function zigzag(ctx, x0, x1, baseY, peaks, variance) {
    var step = (x1 - x0) / peaks;
    ctx.moveTo(x0, baseY + variance);
    for (var i = 0; i <= peaks; i++) {
      var x = x0 + i * step;
      var y = baseY + (i % 2 === 0 ? -variance : variance * 0.4);
      ctx.lineTo(x, y);
    }
  }

  // ---- Mid terrain ----
  function drawTerrain() {
    var tY = H * 0.52;
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(0, tY);
    ctx.lineTo(W * 0.1, tY - H * 0.04);
    ctx.lineTo(W * 0.22, tY - H * 0.02);
    ctx.lineTo(W * 0.38, tY - H * 0.06);
    ctx.lineTo(W * 0.55, tY - H * 0.03);
    ctx.lineTo(W * 0.7,  tY - H * 0.07);
    ctx.lineTo(W * 0.85, tY - H * 0.02);
    ctx.lineTo(W,        tY - H * 0.04);
    ctx.lineTo(W, H); ctx.lineTo(0, H);
    ctx.closePath(); ctx.fill();
  }

  // ---- Ground / regolith ----
  function drawGround() {
    var gY = H * 0.63;
    var grad = ctx.createLinearGradient(0, gY, 0, H);
    grad.addColorStop(0,   '#A0522D');
    grad.addColorStop(0.3, '#8B4513');
    grad.addColorStop(1,   '#654321');
    ctx.fillStyle = grad;
    ctx.fillRect(0, gY, W, H - gY);

    // scattered rocks
    var rocks = [
      {x:0.06,y:0.70,w:14,h:8}, {x:0.18,y:0.75,w:10,h:6},
      {x:0.32,y:0.68,w:18,h:10},{x:0.47,y:0.72,w:12,h:7},
      {x:0.60,y:0.69,w:16,h:9}, {x:0.75,y:0.74,w:11,h:7},
      {x:0.88,y:0.70,w:14,h:8}
    ];
    rocks.forEach(function(r) {
      var rx = r.x * W, ry = r.y * H;
      ctx.fillStyle = '#654321';
      ctx.fillRect(rx, ry, r.w, r.h);
      ctx.fillStyle = 'rgba(100,50,20,0.6)';
      ctx.fillRect(rx + r.w * 0.7, ry + r.h, r.w * 1.1, r.h * 0.3);
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(rx, ry, r.w * 0.55, r.h * 0.4);
    });
  }

  // ---- Habitat modules ----
  var MODULES = [
    { rx:0.17, ry:0.28, rw:0.13, rh:0.22, type:'living',    name:'Living Quarters', color:'#4A90E2' },
    { rx:0.36, ry:0.26, rw:0.13, rh:0.22, type:'lab',       name:'Research Lab',    color:'#7ED321' },
    { rx:0.55, ry:0.28, rw:0.13, rh:0.22, type:'recycling', name:'Radiation Hub',   color:'#F5A623' },
    { rx:0.26, ry:0.52, rw:0.13, rh:0.18, type:'storage',   name:'Storage',         color:'#9013FE' },
    { rx:0.45, ry:0.52, rw:0.13, rh:0.18, type:'greenhouse',name:'Life Support',    color:'#50E3C2' }
  ];

  function drawModules(t) {
    MODULES.forEach(function(m) {
      var x = m.rx * W, y = m.ry * H, w = m.rw * W, h = m.rh * H;

      // Shadow
      ctx.fillStyle = 'rgba(60,20,0,0.5)';
      ctx.fillRect(x + w * 0.08, y + h, w * 1.1, h * 0.12);

      // Module body gradient
      var bg = ctx.createLinearGradient(x, y, x, y + h);
      bg.addColorStop(0,   hexAlpha(m.color, 0.9));
      bg.addColorStop(0.5, hexAlpha(m.color, 0.65));
      bg.addColorStop(1,   hexAlpha(m.color, 0.45));
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, w, h);

      // Glow border
      var glow = 0.5 + Math.sin(t * 1.4 + m.rx * 10) * 0.25;
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 10 * glow;
      ctx.strokeRect(x, y, w, h);
      ctx.shadowBlur = 0;

      // Window
      ctx.fillStyle = 'rgba(135,206,235,0.55)';
      ctx.fillRect(x + w * 0.12, y + h * 0.12, w * 0.3, h * 0.25);
      ctx.strokeStyle = '#87CEEB';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + w * 0.12, y + h * 0.12, w * 0.3, h * 0.25);

      // Status light pulse
      var lAlpha = 0.6 + Math.sin(t * 2.5 + m.rx * 20) * 0.4;
      ctx.fillStyle = 'rgba(0,255,80,' + lAlpha + ')';
      ctx.shadowColor = '#00FF50';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x + w - w * 0.14, y + h * 0.14, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold ' + Math.max(8, w * 0.1) + 'px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 4;
      ctx.fillText(m.name, x + w / 2, y + h / 2 + 4);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';

      // Radiation hub special: animated ring
      if (m.type === 'recycling') {
        drawRadiationRing(x + w / 2, y + h * 0.75, t, m.color);
      }
    });
  }

  function drawRadiationRing(cx, cy, t, color) {
    var r = 8 + Math.sin(t * 2) * 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.3 + Math.sin(t * 2) * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // ---- Connecting tubes ----
  function drawTubes(t) {
    var pairs = [
      [0, 1], [1, 2], [1, 3], [3, 4]
    ];
    pairs.forEach(function(p) {
      var a = MODULES[p[0]], b = MODULES[p[1]];
      var ax = (a.rx + a.rw / 2) * W, ay = (a.ry + a.rh / 2) * H;
      var bx = (b.rx + b.rw / 2) * W, by = (b.ry + b.rh / 2) * H;

      // outer
      ctx.strokeStyle = '#3a3a3a';
      ctx.lineWidth = Math.max(5, W * 0.008);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

      // inner glow
      var glow = 0.6 + Math.sin(t * 1.5) * 0.3;
      ctx.strokeStyle = 'rgba(0,191,255,' + glow + ')';
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.shadowColor = '#00BFFF';
      ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  // ---- Crew walking figures ----
  function drawCrew(t) {
    crewFigures.forEach(function(f) {
      f.x += f.speed * f.dir;
      var groundY = H * 0.63;
      f.y = groundY;
      if (f.x > W * 0.9) f.dir = -1;
      if (f.x < W * 0.08) f.dir = 1;

      var bodyBob = Math.sin(t * 3.5) * 1.5;
      var hh = H * 0.065; // helmet radius
      var bh = H * 0.1;   // body height

      // suit body
      ctx.fillStyle = '#E8E8E8';
      ctx.fillRect(f.x - hh * 0.6, f.y - bh - hh * 1.8 + bodyBob, hh * 1.2, bh);

      // helmet
      ctx.fillStyle = '#D0D8E8';
      ctx.shadowColor = '#a0c8f0';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(f.x, f.y - bh - hh * 1.1 + bodyBob, hh, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // visor
      ctx.fillStyle = 'rgba(100,180,240,0.65)';
      ctx.beginPath();
      ctx.arc(f.x + hh * 0.1 * f.dir, f.y - bh - hh * 1.1 + bodyBob, hh * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // legs
      var legSwing = Math.sin(t * 3.5) * 4;
      ctx.strokeStyle = '#E8E8E8';
      ctx.lineWidth = Math.max(2, hh * 0.35);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.x - hh * 0.2, f.y - hh * 0.6 + bodyBob);
      ctx.lineTo(f.x - hh * 0.4, f.y + legSwing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(f.x + hh * 0.2, f.y - hh * 0.6 + bodyBob);
      ctx.lineTo(f.x + hh * 0.4, f.y - legSwing);
      ctx.stroke();
    });
  }

  // ---- Atmospheric dome ----
  // (subtle shimmer arc above modules)
  function drawAtmoHaze(t) {
    var cx = W * 0.44, cy = H * 0.62, rx = W * 0.38, ry = H * 0.4;
    var alpha = 0.06 + Math.sin(t * 0.4) * 0.03;
    ctx.strokeStyle = 'rgba(200,230,255,' + alpha + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    ctx.stroke();

    // shimmer dots
    for (var i = 0; i < 8; i++) {
      var angle = Math.PI + (i / 7) * Math.PI;
      var sx = cx + Math.cos(angle) * rx;
      var sy = cy + Math.sin(angle) * ry;
      var sa = 0.4 + Math.sin(t * 2.5 + i) * 0.3;
      ctx.fillStyle = 'rgba(255,255,180,' + sa + ')';
      ctx.shadowColor = 'rgba(255,255,100,0.6)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ---- Dust particles ----
  function drawDustParticles(t) {
    dustParticles.forEach(function(p) {
      p.x += p.speed;
      if (p.x > W + 20) p.x = -10;
      var py = p.y + Math.cos(t * 0.6 + p.phase) * 8;

      var shimmer = Math.sin(t * 1.2 + p.shimmerPhase) * 0.5 + 0.5;
      var r = 255, g = Math.floor(195 + 60 * shimmer), b = Math.floor(80 * shimmer * 0.3);
      var alpha = 0.45 + Math.sin(t + p.phase) * 0.25;

      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
      ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
      ctx.shadowBlur = 3 + shimmer * 3;
      ctx.beginPath();
      ctx.arc(p.x, py, p.r + Math.sin(t + p.phase) * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  // ---- Helpers ----
  function hexAlpha(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  // ---- Public API ----
  window.MarsCanvas = { init: init, stop: function(){ if(animId) cancelAnimationFrame(animId); } };

})();
