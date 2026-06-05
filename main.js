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
  var deferredPrompt = null;
  var installDismissed = false;

  // 마우스 포인터 상태 및 플레이 횟수 추적 변수
  var mouseX = -1000;
  var mouseY = -1000;
  var playCount = 0;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    mode = 'menu';
    animId = null;
    lastTime = 0;
    menuPulse = 0;
    loadScores();
    loadDifficulty();
    loadPlayCount();
    setupCanvas();
    bindGlobalInput();
    
    Sound.startBGM();
    
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
    grad.addColorStop(0, '#0f0c1a');
    grad.addColorStop(0.5, '#15102a');
    grad.addColorStop(1, '#1a0e2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var colors = [
      'rgba(233, 30, 99, 0.08)',   // Pink
      'rgba(103, 58, 183, 0.08)',  // Violet
      'rgba(33, 150, 243, 0.06)',   // Blue
      'rgba(0, 188, 212, 0.06)',    // Cyan
      'rgba(233, 30, 99, 0.05)',   // Pink (alt)
      'rgba(156, 39, 176, 0.07)'   // Purple
    ];

    for (var i = 0; i < 6; i++) {
      var bx = (canvas.width * 0.25) + Math.sin(menuPulse * 0.4 + i * 1.5) * canvas.width * 0.35;
      var by = (canvas.height * 0.2) + Math.cos(menuPulse * 0.25 + i * 1.1) * canvas.height * 0.45;
      var br = 35 + Math.sin(menuPulse * 0.8 + i) * 12;

      ctx.save();
      ctx.shadowColor = colors[i % colors.length].replace(/[\d.]+\)$/, '0.3)');
      ctx.shadowBlur = 20;
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGameBg() {
    var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f0c1a');
    grad.addColorStop(0.5, '#130d22');
    grad.addColorStop(1, '#180e2b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawRoundRect(x, y, w, h, r, fill, stroke, lw) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function drawSoundToggle(cx, cy) {
    var isSoundOn = Sound.isEnabled();
    var hovered = (mouseX >= cx - 18 && mouseX <= cx + 18 && mouseY >= cy - 18 && mouseY <= cy + 18);

    ctx.save();
    if (hovered) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
      ctx.shadowBlur = 10;
    }
    var bgFill = hovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.06)';
    var borderStroke = hovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
    drawRoundRect(cx - 18, cy - 18, 36, 36, 12, bgFill, borderStroke, 1.5);
    ctx.restore();

    ctx.font = '16px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isSoundOn ? '#FF6B81' : '#9E9E9E';
    ctx.fillText(isSoundOn ? '\u{1F50A}' : '\u{1F507}', cx, cy);
  }

  function drawMenu() {
    var cx = canvas.width / 2;
    var cw = canvas.width;
    var ch = canvas.height;

    // 사운드 토글
    drawSoundToggle(cw - 45, 42);

    // 타이틀 상자 배경 (아크릴 느낌)
    ctx.save();
    ctx.shadowColor = 'rgba(233, 30, 99, 0.2)';
    ctx.shadowBlur = 20;
    drawRoundRect(cx - 130, ch * 0.08, 260, 58, 20, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.1)', 1.5);
    ctx.restore();

    // HSL 색조 순환 타이틀 그라디언트
    var titleGrad = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0);
    var hue1 = Math.floor(menuPulse * 40) % 360;
    var hue2 = (hue1 + 60) % 360;
    titleGrad.addColorStop(0, 'hsl(' + hue1 + ', 100%, 75%)');
    titleGrad.addColorStop(1, 'hsl(' + hue2 + ', 100%, 75%)');

    ctx.font = 'bold 26px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = titleGrad;
    ctx.fillText('\u{1F3AE} Triple Puzzle', cx, ch * 0.08 + 29);

    ctx.font = '13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#90A4AE';
    ctx.fillText('Match 3  \u2022  Block Puzzle  \u2022  Mahjong', cx, ch * 0.08 + 72);

    var buttons = [
      { label: '\u{1F48E} Anipang', sub: 'Match-3 Puzzle', mode: 'match3', bg: '#FF6B81', border: '#E91E63', glow: 'rgba(233, 30, 99, 0.4)' },
      { label: '\u{1F9E9} Block', sub: 'Puzzle \u2022 8 Stages', mode: 'block', bg: '#42A5F5', border: '#1E88E5', glow: 'rgba(30, 136, 229, 0.4)' },
      { label: '\u{1F004} Mahjong', sub: 'Solitaire', mode: 'mahjong', bg: '#AB47BC', border: '#8E24AA', glow: 'rgba(142, 36, 170, 0.4)' }
    ];

    var btnW = cw - 60;
    var btnH = 68;
    var btnGap = 16;
    var startY = ch * 0.24;

    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var by = startY + i * (btnH + btnGap);

      // 호버 판정
      var hovered = (mouseX >= 30 && mouseX <= 30 + btnW && mouseY >= by && mouseY <= by + btnH);

      ctx.save();
      var drawY = by;
      var drawH = btnH;
      var drawW = btnW;
      var drawX = 30;
      
      if (hovered) {
        ctx.shadowColor = btn.glow;
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 4;
        drawY = by - 2;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
      }
      
      drawRoundRect(drawX, drawY, drawW, drawH, 16, btn.bg, null);
      ctx.restore();

      var borderCol = hovered ? '#FFFFFF' : btn.border;
      drawRoundRect(drawX, drawY, drawW, drawH, 16, null, borderCol, hovered ? 2.5 : 2);

      ctx.font = 'bold 18px "Outfit", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(btn.label, 48, drawY + drawH / 2 - 8);

      ctx.font = '11px "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.75)';
      ctx.fillText(btn.sub, 48, drawY + drawH / 2 + 12);

      ctx.textAlign = 'right';
      ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = hovered ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
      ctx.fillText('\u25B6', 30 + drawW - 20, drawY + drawH / 2);
    }

    var nextY = startY + 3 * (btnH + btnGap);
    
    drawDifficultyToggle(cx, nextY + 8);
    drawScores(cx, nextY + 64);

    if (deferredPrompt && !installDismissed) {
      drawInstallBanner(cx, nextY + 172);
    }
  }

  function drawDifficultyToggle(cx, cy) {
    ctx.font = '12px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#90A4AE';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2699 Difficulty', cx, cy - 6);

    var totalW = 220;
    var btnW = totalW / 3 - 4;
    var btnH = 32;
    var startX = cx - totalW / 2 + 2;
    var diffTopY = cy + 4;

    drawRoundRect(cx - totalW / 2, diffTopY, totalW, btnH, 8, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)', 1);

    for (var i = 0; i < 3; i++) {
      var d = difficultyNames[i];
      var bx = startX + i * (totalW / 3) + 1;
      var bw = totalW / 3 - 2;
      var isSelected = (d === difficulty);

      var hovered = (mouseX >= bx && mouseX <= bx + bw && mouseY >= diffTopY + 1 && mouseY <= diffTopY + btnH - 1);

      if (isSelected) {
        ctx.save();
        ctx.shadowColor = difficultyColors[d];
        ctx.shadowBlur = 8;
        drawRoundRect(bx, cy + 6, bw, btnH - 4, 6, difficultyColors[d], null);
        ctx.restore();

        ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.fillText(difficultyLabels[d], bx + bw / 2, cy + 4 + btnH / 2);
      } else {
        ctx.save();
        if (hovered) {
          drawRoundRect(bx, cy + 6, bw, btnH - 4, 6, 'rgba(255,255,255,0.08)', null);
        }
        ctx.font = '12px "Outfit", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = hovered ? '#FFFFFF' : '#90A4AE';
        ctx.textBaseline = 'middle';
        ctx.fillText(difficultyLabels[d], bx + bw / 2, cy + 4 + btnH / 2);
        ctx.restore();
      }
    }
  }

  function drawScores(cx, cy) {
    var pw = canvas.width - 60;
    var ph = 88;
    
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
    ctx.shadowBlur = 10;
    drawRoundRect(cx - pw/2, cy - 10, pw, ph, 16, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)', 1);
    ctx.restore();

    ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6B81';
    ctx.fillText('\u2B50 BEST RECORDS', cx, cy + 8);

    var modesInfo = [
      { label: 'Match-3', score: highScores.match3 || 0, icon: '\u{1F48E}', color: '#FF6B81' },
      { label: 'Block', score: highScores.block || 0, icon: '\u{1F9E9}', color: '#42A5F5' },
      { label: 'Mahjong', score: highScores.mahjong || 0, icon: '\u{1F004}', color: '#AB47BC' }
    ];

    var itemW = pw / 3;
    var startX = cx - pw / 2;

    for (var i = 0; i < 3; i++) {
      var info = modesInfo[i];
      var itemX = startX + i * itemW + itemW / 2;
      
      ctx.font = '11px "Outfit", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#90A4AE';
      ctx.fillText(info.icon + ' ' + info.label, itemX, cy + 32);

      ctx.font = 'bold 15px "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = info.color;
      ctx.fillText(info.score, itemX, cy + 52);
    }

    ctx.font = '12px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#607D8B';
    ctx.textAlign = 'center';
    ctx.fillText('Total Games Played: ' + playCount, cx, cy + ph + 8);
  }

  function drawInstallBanner(cx, cy) {
    var bw = canvas.width - 60;
    var bh = 44;

    var hovered = (mouseX >= 30 && mouseX <= 30 + bw && mouseY >= cy && mouseY <= cy + bh);

    ctx.save();
    if (hovered) {
      ctx.shadowColor = 'rgba(76, 175, 80, 0.4)';
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = 'rgba(76, 175, 80, 0.2)';
      ctx.shadowBlur = 8;
    }
    ctx.shadowOffsetY = 2;
    drawRoundRect(30, cy, bw, bh, 12, '#4CAF50', null);
    ctx.restore();
    
    var borderCol = hovered ? '#FFFFFF' : '#388E3C';
    drawRoundRect(30, cy, bw, bh, 12, null, borderCol, hovered ? 2 : 1.5);

    ctx.font = 'bold 15px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2B07 Install App', cx, cy + bh / 2 - 2);

    var closeX = 30 + bw - 16;
    var isCloseHovered = (mouseX >= closeX - 10 && mouseX <= closeX + 10 && mouseY >= cy + 4 && mouseY <= cy + 20);
    
    ctx.font = 'bold 11px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = isCloseHovered ? '#FFCDD2' : 'rgba(255,255,255,0.7)';
    ctx.fillText('\u2715', closeX, cy + 12);
  }

  function switchMode(newMode) {
    if (mode === newMode) return;

    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }
    else if (mode === 'block') { prevScore = BlockPuzzle.getScore(); BlockPuzzle.destroy(); }
    else if (mode === 'mahjong') { prevScore = Mahjong.getScore(); Mahjong.destroy(); }

    saveScore(mode, prevScore);

    mode = newMode;

    if (mode === 'match3') { Match3.init(canvas, ctx, goToMenu, difficulty); Match3.setHighScore(highScores.match3 || 0); incrementPlayCount(); }
    else if (mode === 'block') { BlockPuzzle.init(canvas, ctx, goToMenu, difficulty); BlockPuzzle.setHighScore(highScores.block || 0); incrementPlayCount(); }
    else if (mode === 'mahjong') { Mahjong.init(canvas, ctx, goToMenu, difficulty); Mahjong.setHighScore(highScores.mahjong || 0); incrementPlayCount(); }

    startCalled[mode] = true;
  }

  function goToMenu() {
    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }
    else if (mode === 'block') { prevScore = BlockPuzzle.getScore(); BlockPuzzle.destroy(); }
    else if (mode === 'mahjong') { prevScore = Mahjong.getScore(); Mahjong.destroy(); }

    saveScore(mode, prevScore);
    mode = 'menu';
    // 메뉴로 복귀했을 때 호버 상태 초기화
    mouseX = -1000;
    mouseY = -1000;
  }

  function bindGlobalInput() {
    canvas.addEventListener('click', onMenuClick);
    canvas.addEventListener('touchstart', onMenuTouch, { passive: false });
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
  }

  function onMouseMove(e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  }

  function onMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
  }

  function onTouchMove(e) {
    if (mode !== 'menu') return;
    if (e.touches.length > 0) {
      var rect = canvas.getBoundingClientRect();
      mouseX = (e.touches[0].clientX - rect.left) * (canvas.width / rect.width);
      mouseY = (e.touches[0].clientY - rect.top) * (canvas.height / rect.height);
    }
  }

  function onTouchEnd() {
    mouseX = -1000;
    mouseY = -1000;
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

    var startY = ch * 0.24;
    var btnW = cw - 60;
    var btnH = 68;
    var btnGap = 16;

    // 사운드 토글 클릭 판정
    var soundX = cw - 45;
    var soundY = 42;
    if (x >= soundX - 18 && x <= soundX + 18 && y >= soundY - 18 && y <= soundY + 18) {
      var isSoundOn = Sound.isEnabled();
      Sound.enabled(!isSoundOn);
      Sound.click();
      return;
    }

    // 난이도 토글 클릭 판정
    var diffCY = startY + 3 * (btnH + btnGap) + 8;
    var totalW = 220;
    var startX = cw / 2 - totalW / 2 + 2;
    var diffBtnH = 32;
    var diffTopY = diffCY + 4;
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

    // 설치 배너 클릭 판정
    if (deferredPrompt && !installDismissed) {
      var instY = startY + 3 * (btnH + btnGap) + 172;
      var instW = cw - 60;
      var instH = 44;
      if (x >= 30 && x <= 30 + instW && y >= instY && y <= instY + instH) {
        var closeX = 30 + instW - 16;
        if (x >= closeX - 10 && x <= closeX + 10 && y >= instY + 4 && y <= instY + 20) {
          installDismissed = true;
          return;
        }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (result) {
          if (result.outcome === 'accepted') {
            installDismissed = true;
          }
          deferredPrompt = null;
        });
        return;
      }
    }

    // 게임 모드 선택 클릭 판정
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

  function loadPlayCount() {
    try {
      var count = localStorage.getItem('triplePuzzlePlayCount');
      playCount = count ? parseInt(count, 10) : 0;
    } catch (e) {
      playCount = 0;
    }
  }

  function incrementPlayCount() {
    playCount++;
    try {
      localStorage.setItem('triplePuzzlePlayCount', playCount);
    } catch (e) {}
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