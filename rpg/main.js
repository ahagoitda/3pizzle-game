var Game = (function () {
  'use strict';

  var canvas, ctx, mode, animId, lastTime;
  var highScores = {};
  var startCalled = {};
  var menuPulse;

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    mode = 'menu';
    animId = null;
    lastTime = 0;
    menuPulse = 0;
    loadScores();
    setupCanvas();
    bindGlobalInput();
    requestAnimationFrame(loop);
  }

  function setupCanvas() {
    var size = Math.min(window.innerWidth, window.innerHeight, 520);
    canvas.width = size;
    canvas.height = Math.floor(size * 1.6);
  }

  function loop(ts) {
    var dt = (ts - lastTime) / 1000;
    if (dt > 0.1) dt = 0.016;
    lastTime = ts;

    update(dt);
    render();

    animId = requestAnimationFrame(loop);
  }

  function update(dt) {
    menuPulse += dt;

    if (mode === 'match3') Match3.update(dt);
    else if (mode === 'block') BlockPuzzle.update(dt);
    else if (mode === 'mahjong') Mahjong.update(dt);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f0f23';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var grad = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.3, 0,
      canvas.width / 2, canvas.height * 0.3, canvas.height);
    grad.addColorStop(0, '#1a1a3e');
    grad.addColorStop(1, '#0a0a1a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'menu') drawMenu();
    else if (mode === 'match3') Match3.render();
    else if (mode === 'block') BlockPuzzle.render();
    else if (mode === 'mahjong') Mahjong.render();
  }

  function drawMenu() {
    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var glowAlpha = 0.5 + 0.3 * Math.sin(menuPulse * 2);
    ctx.shadowColor = 'rgba(255, 215, 0, ' + glowAlpha + ')';
    ctx.shadowBlur = 20;

    var titleGrad = ctx.createLinearGradient(cx - 140, cy - 240, cx + 140, cy - 200);
    titleGrad.addColorStop(0, '#FFD700');
    titleGrad.addColorStop(0.5, '#FFEAA7');
    titleGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = titleGrad;
    ctx.fillText('Triple Puzzle', cx, cy - 220);

    ctx.shadowBlur = 0;

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Match 3  |  Block Puzzle  |  Mahjong', cx, cy - 175);

    var buttons = [
      { label: 'Anipang', sub: 'Match-3', mode: 'match3', col: '#FF6B81' },
      { label: 'Block', sub: 'Puzzle', mode: 'block', col: '#60A5FA' },
      { label: 'Mahjong', sub: 'Solitaire', mode: 'mahjong', col: '#A855F7' }
    ];

    for (var i = 0; i < buttons.length; i++) {
      drawMenuButton(buttons[i], cx, cy - 40 + i * 110, cx - 100, 90);
    }

    drawScores(cx, cy + 250);
  }

  function drawMenuButton(btn, cx, cy, bx, bw) {
    var highlight = btn.mode === mode ? 0.15 : 0;

    ctx.shadowColor = btn.col;
    ctx.shadowBlur = 10 + 5 * Math.sin(menuPulse * 1.5 + (btn.mode === 'match3' ? 0 : btn.mode === 'block' ? 2 : 4));

    var btnGrad = ctx.createLinearGradient(bx, cy - 35, bx, cy + 35);
    btnGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
    btnGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    btnGrad.addColorStop(1, 'rgba(255,255,255,0.01)');
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(bx, cy - 35, bw, 70, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, cy - 35, bw, 70, 16);
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = btn.col;
    ctx.fillText(btn.label, cx, cy - 8);

    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(btn.sub, cx, cy + 16);
  }

  function drawScores(cx, cy) {
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.fillText('High Scores', cx, cy - 15);

    var scoreText = '';
    if (highScores.match3) scoreText += 'Match: ' + highScores.match3 + '  ';
    if (highScores.block) scoreText += 'Block: ' + highScores.block + '  ';
    if (highScores.mahjong) scoreText += 'Mahjong: ' + highScores.mahjong;

    if (scoreText) {
      ctx.fillText(scoreText, cx, cy + 5);
    }
  }

  function switchMode(newMode) {
    if (mode === newMode) return;

    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }
    else if (mode === 'block') { prevScore = BlockPuzzle.getScore(); BlockPuzzle.destroy(); }
    else if (mode === 'mahjong') { prevScore = Mahjong.getScore(); Mahjong.destroy(); }

    saveScore(mode, prevScore);

    mode = newMode;

    if (mode === 'match3') Match3.init(canvas, ctx, goToMenu);
    else if (mode === 'block') BlockPuzzle.init(canvas, ctx, goToMenu);
    else if (mode === 'mahjong') Mahjong.init(canvas, ctx, goToMenu);

    startCalled[mode] = true;
  }

  function goToMenu() {
    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }
    else if (mode === 'block') { prevScore = BlockPuzzle.getScore(); BlockPuzzle.destroy(); }
    else if (mode === 'mahjong') { prevScore = Mahjong.getScore(); Mahjong.destroy(); }

    saveScore(mode, prevScore);
    mode = 'menu';
  }

  function bindGlobalInput() {
    canvas.addEventListener('click', onMenuClick);
    canvas.addEventListener('touchstart', onMenuTouch, { passive: false });
  }

  function onMenuClick(e) {
    if (mode !== 'menu') return;
    handleMenuTap(e.clientX, e.clientY);
  }

  function onMenuTouch(e) {
    if (mode !== 'menu') return;
    if (e.touches.length > 0) {
      handleMenuTap(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function handleMenuTap(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * (canvas.width / rect.width);
    var y = (clientY - rect.top) * (canvas.height / rect.height);
    var cy = canvas.height / 2;

    var buttons = [
      { mode: 'match3', y: cy - 5 },
      { mode: 'block', y: cy + 105 },
      { mode: 'mahjong', y: cy + 215 }
    ];

    var bx = canvas.width / 2 - 100, bw = 200;
    for (var i = 0; i < buttons.length; i++) {
      var by = buttons[i].y - 35;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + 70) {
        switchMode(buttons[i].mode);
        return;
      }
    }
  }

  function loadScores() {
    try {
      var raw = localStorage.getItem('triplePuzzleScores');
      if (raw) highScores = JSON.parse(raw);
    } catch (e) {
      highScores = {};
    }
    if (!highScores || typeof highScores !== 'object') highScores = {};
  }

  function saveScore(gameMode, score) {
    if (!score || score <= 0) return;
    var key = gameMode;
    if (!highScores[key] || score > highScores[key]) {
      highScores[key] = score;
      try {
        localStorage.setItem('triplePuzzleScores', JSON.stringify(highScores));
      } catch (e) { }
    }
  }

  window.addEventListener('resize', function () {
    setupCanvas();
    if (mode === 'match3') { Match3.destroy(); Match3.init(canvas, ctx, goToMenu); }
    else if (mode === 'block') { BlockPuzzle.destroy(); BlockPuzzle.init(canvas, ctx, goToMenu); }
    else if (mode === 'mahjong') { Mahjong.destroy(); Mahjong.init(canvas, ctx, goToMenu); }
  });

  init();

  return {};
})();
