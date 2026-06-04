var Game = (function () {
  'use strict';

  var canvas, ctx, mode, animId, lastTime;
  var highScores = {};
  var startCalled = {};
  var menuPulse;
  var difficulty = 'normal';
  var difficultyNames = ['easy', 'normal', 'hard'];
  var difficultyLabels = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
  var difficultyColors = { easy: '#4CAF50', normal: '#FF9800', hard: '#F44336' };
  var difficultyBg = { easy: '#E8F5E9', normal: '#FFF3E0', hard: '#FFEBEE' };

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    mode = 'menu';
    animId = null;
    lastTime = 0;
    menuPulse = 0;
    loadScores();
    loadDifficulty();
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

    if (mode === 'menu') {
      drawMenuBg();
      drawMenu();
    } else if (mode === 'match3') {
      drawGameBg();
      Match3.render();
    } else if (mode === 'block') {
      drawGameBg();
      BlockPuzzle.render();
    } else if (mode === 'mahjong') {
      drawGameBg();
      Mahjong.render();
    }
  }

  function drawMenuBg() {
    var grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#E8EAF6');
    grad.addColorStop(0.5, '#FCE4EC');
    grad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < 6; i++) {
      var bx = (canvas.width * 0.2) + Math.sin(menuPulse * 0.5 + i * 1.2) * canvas.width * 0.3;
      var by = (canvas.height * 0.15) + Math.cos(menuPulse * 0.3 + i * 0.8) * canvas.height * 0.4;
      var br = 30 + Math.sin(menuPulse + i) * 10;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGameBg() {
    var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#F3E5F5');
    grad.addColorStop(0.3, '#E8EAF6');
    grad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawRoundRect(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function drawMenu() {
    var cx = canvas.width / 2;
    var cw = canvas.width;
    var ch = canvas.height;

    ctx.save();
    ctx.shadowColor = 'rgba(233, 30, 99, 0.3)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetY = 3;
    drawRoundRect(cx - 120, ch * 0.08, 240, 58, 20, '#FF6B81', null);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();

    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F3AE} Triple Puzzle', cx, ch * 0.08 + 29);

    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9E9E9E';
    ctx.fillText('Match 3  \u2022  Block Puzzle  \u2022  Mahjong', cx, ch * 0.08 + 70);

    var buttons = [
      { label: '\u{1F48E} Anipang', sub: 'Match-3 Puzzle', mode: 'match3', bg: '#FF6B81', border: '#E91E63' },
      { label: '\u{1F9E9} Block', sub: 'Puzzle \u2022 8 Stages', mode: 'block', bg: '#42A5F5', border: '#1E88E5' },
      { label: '\u{1F004} Mahjong', sub: 'Solitaire', mode: 'mahjong', bg: '#AB47BC', border: '#8E24AA' }
    ];

    var btnW = cw - 60;
    var btnH = 64;
    var btnGap = 14;
    var startY = ch * 0.26;

    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var by = startY + i * (btnH + btnGap);

      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      drawRoundRect(30, by, btnW, btnH, 14, btn.bg, null);
      ctx.restore();

      drawRoundRect(30, by, btnW, btnH, 14, btn.bg, btn.border, 2);

      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(btn.label, 46, by + btnH / 2 - 6);

      ctx.font = '11px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(btn.sub, 46, by + btnH / 2 + 12);

      ctx.textAlign = 'right';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('\u25B6', 30 + btnW - 18, by + btnH / 2);
    }

    drawDifficultyToggle(cx, startY + 3 * (btnH + btnGap) + 8);

    drawScores(cx, startY + 3 * (btnH + btnGap) + 58);
  }

  function drawDifficultyToggle(cx, cy) {
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9E9E9E';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2699 Difficulty', cx, cy - 6);

    var totalW = 200;
    var btnW = totalW / 3 - 4;
    var btnH = 30;
    var startX = cx - totalW / 2 + 2;

    drawRoundRect(cx - totalW / 2, cy + 4, totalW, btnH, 8, '#ECEFF1', '#CFD8DC', 1);

    for (var i = 0; i < 3; i++) {
      var d = difficultyNames[i];
      var bx = startX + i * (totalW / 3) + 1;
      var isSelected = (d === difficulty);
      var bw = totalW / 3 - 2;

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = difficultyColors[d];
        ctx.shadowBlur = 6;
        drawRoundRect(bx, cy + 6, bw, btnH - 4, 6, difficultyColors[d], null);
        ctx.restore();

        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(difficultyLabels[d], bx + bw / 2, cy + 4 + btnH / 2);
      } else {
        ctx.font = '12px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#90A4AE';
        ctx.textBaseline = 'middle';
        ctx.fillText(difficultyLabels[d], bx + bw / 2, cy + 4 + btnH / 2);
      }
    }
  }

  function drawScores(cx, cy) {
    ctx.save();
    drawRoundRect(cx - 100, cy - 12, 200, 38, 10, '#FFFFFF', '#E0E0E0', 1);
    ctx.restore();

    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9E9E9E';
    ctx.fillText('\u2B50 Best Scores', cx, cy);

    var scores = [];
    if (highScores.match3) scores.push('M:' + highScores.match3);
    if (highScores.block) scores.push('B:' + highScores.block);
    if (highScores.mahjong) scores.push('S:' + highScores.mahjong);
    if (scores.length > 0) {
      ctx.fillStyle = '#FF6B81';
      ctx.font = 'bold 12px "Segoe UI", sans-serif';
      ctx.fillText(scores.join('  '), cx, cy + 15);
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

    if (mode === 'match3') { Match3.init(canvas, ctx, goToMenu, difficulty); Match3.setHighScore(highScores.match3 || 0); }
    else if (mode === 'block') { BlockPuzzle.init(canvas, ctx, goToMenu, difficulty); BlockPuzzle.setHighScore(highScores.block || 0); }
    else if (mode === 'mahjong') { Mahjong.init(canvas, ctx, goToMenu, difficulty); Mahjong.setHighScore(highScores.mahjong || 0); }

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
    var cw = canvas.width;
    var ch = canvas.height;

    var diffCY = ch * 0.26 + 3 * 78 + 8 + 22;
    var totalW = 200;
    var startX = cw / 2 - totalW / 2 + 2;
    var diffBtnH = 26;
    var diffTopY = diffCY - 6 + 10;
    if (y >= diffTopY && y <= diffTopY + diffBtnH) {
      for (var d = 0; d < 3; d++) {
        var bx = startX + d * (totalW / 3) + 1;
        var bw = totalW / 3 - 2;
        if (x >= bx && x <= bx + bw) {
          difficulty = difficultyNames[d];
          saveDifficulty();
          Sound.click();
          return;
        }
      }
    }

    var btnW = cw - 60;
    var btnH = 64;
    var btnGap = 14;
    var startY = ch * 0.26;
    var buttons = ['match3', 'block', 'mahjong'];

    for (var i = 0; i < buttons.length; i++) {
      var by = startY + i * (btnH + btnGap);
      if (x >= 30 && x <= 30 + btnW && y >= by && y <= by + btnH) {
        Sound.click();
        switchMode(buttons[i]);
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

  function loadDifficulty() {
    try {
      var d = localStorage.getItem('triplePuzzleDifficulty');
      if (d === 'easy' || d === 'normal' || d === 'hard') difficulty = d;
    } catch (e) { }
  }

  function saveDifficulty() {
    try {
      localStorage.setItem('triplePuzzleDifficulty', difficulty);
    } catch (e) { }
  }

  window.addEventListener('resize', function () {
    setupCanvas();
    if (mode === 'match3') { Match3.destroy(); Match3.init(canvas, ctx, goToMenu, difficulty); Match3.setHighScore(highScores.match3 || 0); }
    else if (mode === 'block') { BlockPuzzle.destroy(); BlockPuzzle.init(canvas, ctx, goToMenu, difficulty); BlockPuzzle.setHighScore(highScores.block || 0); }
    else if (mode === 'mahjong') { Mahjong.destroy(); Mahjong.init(canvas, ctx, goToMenu, difficulty); Mahjong.setHighScore(highScores.mahjong || 0); }
  });

  init();

  return {
    getDifficulty: function () { return difficulty; },
    getHighScores: function () { return highScores; }
  };
})();