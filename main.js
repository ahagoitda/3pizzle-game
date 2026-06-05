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
  var worldImages = { world1: null, world2: null };

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

    // Load world images
    worldImages.world1 = new Image();
    worldImages.world1.src = 'assets/world1_forest.png';
    worldImages.world2 = new Image();
    worldImages.world2.src = 'assets/world2_cave.png';
    worldImages.world3 = new Image();
    worldImages.world3.src = 'assets/world3_volcano.png';

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
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (mode === 'menu') {
      drawMenuBg();
      drawMenu();
    } else if (mode === 'match3') {
      drawGameBg();
      Match3.render();
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
    drawRoundRect(cx - 130, ch * 0.04, 260, 48, 16, 'rgba(25, 18, 48, 0.85)', 'rgba(255, 255, 255, 0.08)', 1.5);
    ctx.restore();

    var titleGrad = ctx.createLinearGradient(cx - 100, 0, cx + 100, 0);
    var hue1 = Math.floor(menuPulse * 40) % 360;
    var hue2 = (hue1 + 60) % 360;
    titleGrad.addColorStop(0, 'hsl(' + hue1 + ', 100%, 75%)');
    titleGrad.addColorStop(1, 'hsl(' + hue2 + ', 100%, 75%)');

    ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = titleGrad;
    ctx.fillText('🌸 Match-3 Stage Mode', cx, ch * 0.04 + 24);

    var unlockedLvlId = Match3Levels.getUnlockedLevel();
    var unlockedIdx = Match3Levels.getLevelIndex(unlockedLvlId);

    // 1. World 1 Card
    var w1Y = 90;
    var cardW = cw - 60;
    var cardH = 80;
    
    var cardGrad = ctx.createLinearGradient(30, w1Y, 30 + cardW, w1Y + cardH);
    cardGrad.addColorStop(0, 'rgba(46, 213, 115, 0.08)');
    cardGrad.addColorStop(0.5, 'rgba(102, 187, 106, 0.05)');
    cardGrad.addColorStop(1, 'rgba(0, 150, 136, 0.1)');
    drawRoundRect(30, w1Y, cardW, cardH, 16, cardGrad, 'rgba(255, 67, 101, 0.15)', 1.2);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(30, w1Y, cardW, cardH, 16);
    ctx.clip();
    
    if (worldImages.world1 && worldImages.world1.complete && worldImages.world1.naturalWidth !== 0) {
      var img = worldImages.world1;
      var imgRatio = img.width / img.height;
      var cardRatio = cardW / cardH;
      var dw, dh, dx, dy;
      if (imgRatio > cardRatio) {
        dh = cardH;
        dw = cardH * imgRatio;
        dx = 30 + (cardW - dw) / 2;
        dy = w1Y;
      } else {
        dw = cardW;
        dh = cardW / imgRatio;
        dx = 30;
        dy = w1Y + (cardH - dh) / 2;
      }
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1.0;
    } else {
      ctx.fillStyle = 'rgba(46, 213, 115, 0.04)';
      ctx.beginPath();
      ctx.arc(30 + cardW * 0.25, w1Y + cardH + 10, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 150, 136, 0.04)';
      ctx.beginPath();
      ctx.arc(30 + cardW * 0.75, w1Y + cardH + 20, 60, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
      ctx.beginPath();
      ctx.ellipse(30 + cardW - 35, w1Y + 22, 6, 10, 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    
    ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FF6B81';
    ctx.textAlign = 'left';
    ctx.fillText('🌸 World 1: Sweet Forest', 42, w1Y + 16);

    var circleW = 34;
    var circleGap = 16;
    var totalW = 5 * circleW + 4 * circleGap;
    var startX = cx - totalW / 2;
    var cy1 = w1Y + 48;

    for (var i = 0; i < 5; i++) {
      var lvl = Match3Levels.levels[i];
      var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
      var isUnlocked = i <= unlockedIdx;
      var isCleared = i < unlockedIdx;
      
      var isHovered = (mouseX >= cx_node - circleW/2 && mouseX <= cx_node + circleW/2 && mouseY >= cy1 - circleW/2 && mouseY <= cy1 + circleW/2);
      
      ctx.save();
      var nodeBg, nodeStroke, textCol;
      if (isCleared) {
        nodeBg = isHovered ? '#FFD700' : 'rgba(255, 215, 0, 0.15)';
        nodeStroke = '#FFD700';
        textCol = isHovered ? '#000000' : '#FFD700';
      } else if (isUnlocked) {
        var pulse = 0.5 + 0.5 * Math.sin(menuPulse * 6);
        nodeBg = isHovered ? '#FF4757' : 'rgba(255, 71, 87, 0.25)';
        nodeStroke = 'rgba(255, 255, 255, ' + (0.6 + 0.4 * pulse) + ')';
        textCol = '#FFFFFF';
        if (isHovered) {
          ctx.shadowColor = '#FF4757';
          ctx.shadowBlur = 10;
        }
      } else {
        nodeBg = 'rgba(255, 255, 255, 0.02)';
        nodeStroke = 'rgba(255, 255, 255, 0.08)';
        textCol = 'rgba(255, 255, 255, 0.2)';
      }
      
      drawRoundRect(cx_node - circleW/2, cy1 - circleW/2, circleW, circleW, circleW/2, nodeBg, nodeStroke, isUnlocked ? 2 : 1);
      ctx.restore();

      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = textCol;
      ctx.fillText(isUnlocked ? lvl.id : '🔒', cx_node, cy1);
    }

    // 2. World 2 Card
    var w2Y = w1Y + cardH + 14;
    
    var cardGrad2 = ctx.createLinearGradient(30, w2Y, 30 + cardW, w2Y + cardH);
    cardGrad2.addColorStop(0, 'rgba(0, 188, 212, 0.08)');
    cardGrad2.addColorStop(0.5, 'rgba(128, 222, 234, 0.04)');
    cardGrad2.addColorStop(1, 'rgba(103, 58, 183, 0.1)');
    drawRoundRect(30, w2Y, cardW, cardH, 16, cardGrad2, 'rgba(0, 188, 212, 0.15)', 1.2);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(30, w2Y, cardW, cardH, 16);
    ctx.clip();

    if (worldImages.world2 && worldImages.world2.complete && worldImages.world2.naturalWidth !== 0) {
      var img = worldImages.world2;
      var imgRatio = img.width / img.height;
      var cardRatio = cardW / cardH;
      var dw, dh, dx, dy;
      if (imgRatio > cardRatio) {
        dh = cardH;
        dw = cardH * imgRatio;
        dx = 30 + (cardW - dw) / 2;
        dy = w2Y;
      } else {
        dw = cardW;
        dh = cardW / imgRatio;
        dx = 30;
        dy = w2Y + (cardH - dh) / 2;
      }
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1.0;
    } else {
      // Procedural fallback for World 2: Glowing cyan/purple crystals
      var gradFallback2 = ctx.createLinearGradient(30, w2Y, 30 + cardW, w2Y + cardH);
      gradFallback2.addColorStop(0, '#091526');
      gradFallback2.addColorStop(0.5, '#0c2b3e');
      gradFallback2.addColorStop(1, '#1e0c2f');
      ctx.fillStyle = gradFallback2;
      ctx.fillRect(30, w2Y, cardW, cardH);
      
      // Draw glowing crystal shapes
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (var k = 0; k < 3; k++) {
        var crystX = 30 + cardW * (0.2 + k * 0.3) + Math.sin(menuPulse * 0.5 + k) * 15;
        var crystY = w2Y + cardH * 0.5 + Math.cos(menuPulse * 0.5 + k) * 5;
        ctx.fillStyle = k === 1 ? '#A855F7' : '#00CBD4';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(crystX, crystY - 18);
        ctx.lineTo(crystX + 8, crystY - 4);
        ctx.lineTo(crystX + 5, crystY + 12);
        ctx.lineTo(crystX - 5, crystY + 12);
        ctx.lineTo(crystX - 8, crystY - 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    
    ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#00CBD4';
    ctx.textAlign = 'left';
    ctx.fillText('💎 World 2: Neon Cave', 42, w2Y + 16);

    var cy2 = w2Y + 48;
    for (var i = 0; i < 5; i++) {
      var lvlIdx = i + 5;
      var lvl = Match3Levels.levels[lvlIdx];
      var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
      var isUnlocked = lvlIdx <= unlockedIdx;
      var isCleared = lvlIdx < unlockedIdx;
      
      var isHovered = (mouseX >= cx_node - circleW/2 && mouseX <= cx_node + circleW/2 && mouseY >= cy2 - circleW/2 && mouseY <= cy2 + circleW/2);
      
      ctx.save();
      var nodeBg, nodeStroke, textCol;
      if (isCleared) {
        nodeBg = isHovered ? '#FFD700' : 'rgba(255, 215, 0, 0.15)';
        nodeStroke = '#FFD700';
        textCol = isHovered ? '#000000' : '#FFD700';
      } else if (isUnlocked) {
        var pulse = 0.5 + 0.5 * Math.sin(menuPulse * 6);
        nodeBg = isHovered ? '#00CBD4' : 'rgba(0, 203, 212, 0.25)';
        nodeStroke = 'rgba(255, 255, 255, ' + (0.6 + 0.4 * pulse) + ')';
        textCol = '#FFFFFF';
        if (isHovered) {
          ctx.shadowColor = '#00CBD4';
          ctx.shadowBlur = 10;
        }
      } else {
        nodeBg = 'rgba(255, 255, 255, 0.02)';
        nodeStroke = 'rgba(255, 255, 255, 0.08)';
        textCol = 'rgba(255, 255, 255, 0.2)';
      }
      
      drawRoundRect(cx_node - circleW/2, cy2 - circleW/2, circleW, circleW, circleW/2, nodeBg, nodeStroke, isUnlocked ? 2 : 1);
      ctx.restore();

      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = textCol;
      ctx.fillText(isUnlocked ? lvl.id : '🔒', cx_node, cy2);
    }

    // 3. World 3 Card
    var w3Y = w2Y + cardH + 14;
    
    var cardGrad3 = ctx.createLinearGradient(30, w3Y, 30 + cardW, w3Y + cardH);
    cardGrad3.addColorStop(0, 'rgba(244, 67, 54, 0.08)');
    cardGrad3.addColorStop(0.5, 'rgba(255, 87, 34, 0.04)');
    cardGrad3.addColorStop(1, 'rgba(191, 54, 12, 0.1)');
    drawRoundRect(30, w3Y, cardW, cardH, 16, cardGrad3, 'rgba(244, 67, 54, 0.15)', 1.2);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(30, w3Y, cardW, cardH, 16);
    ctx.clip();

    if (worldImages.world3 && worldImages.world3.complete && worldImages.world3.naturalWidth !== 0) {
      var img = worldImages.world3;
      var imgRatio = img.width / img.height;
      var cardRatio = cardW / cardH;
      var dw, dh, dx, dy;
      if (imgRatio > cardRatio) {
        dh = cardH;
        dw = cardH * imgRatio;
        dx = 30 + (cardW - dw) / 2;
        dy = w3Y;
      } else {
        dw = cardW;
        dh = cardW / imgRatio;
        dx = 30;
        dy = w3Y + (cardH - dh) / 2;
      }
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.globalAlpha = 1.0;
    } else {
      // Procedural fallback for World 3: Bubbling volcanic lava
      var gradFallback3 = ctx.createLinearGradient(30, w3Y, 30 + cardW, w3Y + cardH);
      gradFallback3.addColorStop(0, '#1c0707');
      gradFallback3.addColorStop(0.5, '#3a0d0d');
      gradFallback3.addColorStop(1, '#120404');
      ctx.fillStyle = gradFallback3;
      ctx.fillRect(30, w3Y, cardW, cardH);
      
      // Draw bubbling lava circles
      ctx.save();
      ctx.globalAlpha = 0.6;
      for (var k = 0; k < 4; k++) {
        var lavaX = 30 + cardW * (0.15 + k * 0.23) + Math.cos(menuPulse * 0.8 + k) * 8;
        var lavaY = w3Y + cardH * 0.6 + Math.sin(menuPulse * 0.9 + k) * 4;
        var lavaR = 12 + 4 * Math.sin(menuPulse * 1.2 + k);
        var lavaGrad = ctx.createRadialGradient(lavaX, lavaY, 2, lavaX, lavaY, lavaR);
        lavaGrad.addColorStop(0, '#FFD700');
        lavaGrad.addColorStop(0.4, '#FF5722');
        lavaGrad.addColorStop(1, 'rgba(244, 67, 54, 0)');
        ctx.fillStyle = lavaGrad;
        ctx.beginPath();
        ctx.arc(lavaX, lavaY, lavaR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
    
    ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FF5722';
    ctx.textAlign = 'left';
    ctx.fillText('🌋 World 3: Volcanic Core', 42, w3Y + 16);

    var cy3 = w3Y + 48;
    for (var i = 0; i < 5; i++) {
      var lvlIdx = i + 10;
      var lvl = Match3Levels.levels[lvlIdx];
      var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
      var isUnlocked = lvlIdx <= unlockedIdx;
      var isCleared = lvlIdx < unlockedIdx;
      
      var isHovered = (mouseX >= cx_node - circleW/2 && mouseX <= cx_node + circleW/2 && mouseY >= cy3 - circleW/2 && mouseY <= cy3 + circleW/2);
      
      ctx.save();
      var nodeBg, nodeStroke, textCol;
      if (isCleared) {
        nodeBg = isHovered ? '#FFD700' : 'rgba(255, 215, 0, 0.15)';
        nodeStroke = '#FFD700';
        textCol = isHovered ? '#000000' : '#FFD700';
      } else if (isUnlocked) {
        var pulse = 0.5 + 0.5 * Math.sin(menuPulse * 6);
        nodeBg = isHovered ? '#FF5722' : 'rgba(255, 87, 34, 0.25)';
        nodeStroke = 'rgba(255, 255, 255, ' + (0.6 + 0.4 * pulse) + ')';
        textCol = '#FFFFFF';
        if (isHovered) {
          ctx.shadowColor = '#FF5722';
          ctx.shadowBlur = 10;
        }
      } else {
        nodeBg = 'rgba(255, 255, 255, 0.02)';
        nodeStroke = 'rgba(255, 255, 255, 0.08)';
        textCol = 'rgba(255, 255, 255, 0.2)';
      }
      
      drawRoundRect(cx_node - circleW/2, cy3 - circleW/2, circleW, circleW, circleW/2, nodeBg, nodeStroke, isUnlocked ? 2 : 1);
      ctx.restore();

      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = textCol;
      ctx.fillText(isUnlocked ? lvl.id : '🔒', cx_node, cy3);
    }

    var diffCY = w3Y + cardH + 16;
    drawDifficultyToggle(cx, diffCY);

    var recordsY = diffCY + 32 + 16;
    drawScores(cx, recordsY);

    if (deferredPrompt && !installDismissed) {
      var instY = recordsY + 76 + 16;
      drawInstallBanner(cx, instY);
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
    var ph = 76;
    
    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
    ctx.shadowBlur = 10;
    drawRoundRect(cx - pw/2, cy - 10, pw, ph, 16, 'rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.08)', 1);
    ctx.restore();

    ctx.font = 'bold 13px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6B81';
    ctx.fillText('\u2B50 BEST MATCH-3 RECORD', cx, cy + 10);

    ctx.font = 'bold 20px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F48E} ' + (highScores.match3 || 0), cx, cy + 38);

    ctx.font = '12px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#607D8B';
    ctx.textAlign = 'center';
    ctx.fillText('Total Games Played: ' + playCount, cx, cy + ph + 8);
  }

  function drawInstallBanner(cx, cy) {
    var bw = canvas.width - 60;
    var bh = 44;

    var closeX = 30 + bw - 16;
    var isCloseHovered = (mouseX >= closeX - 10 && mouseX <= closeX + 10 && mouseY >= cy + 4 && mouseY <= cy + 20);
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
    ctx.font = 'bold 11px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = isCloseHovered ? '#FFCDD2' : 'rgba(255,255,255,0.7)';
    ctx.fillText('\u2715', closeX, cy + 12);
  }

  var selectedLevelId = '1-1';

  function switchMode(newMode, lvlId) {
    if (mode === newMode) return;

    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }

    saveScore(mode, prevScore);

    mode = newMode;

    if (mode === 'match3') { 
      selectedLevelId = lvlId || '1-1';
      Match3.init(canvas, ctx, goToMenu, difficulty, selectedLevelId); 
      Match3.setHighScore(highScores.match3 || 0); 
      incrementPlayCount(); 
    }

    startCalled[mode] = true;
  }

  function goToMenu() {
    var prevScore = 0;
    if (mode === 'match3') { prevScore = Match3.getScore(); Match3.destroy(); }

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

    // 사운드 토글 클릭 판정
    var soundX = cw - 45;
    var soundY = 42;
    if (x >= soundX - 18 && x <= soundX + 18 && y >= soundY - 18 && y <= soundY + 18) {
      var isSoundOn = Sound.isEnabled();
      Sound.enabled(!isSoundOn);
      Sound.click();
      return;
    }

    var circleW = 34;
    var circleGap = 16;
    var totalW = 5 * circleW + 4 * circleGap;
    var startX = cw / 2 - totalW / 2;
    var cy1 = 90 + 48;
    var unlockedLvlId = Match3Levels.getUnlockedLevel();
    var unlockedIdx = Match3Levels.getLevelIndex(unlockedLvlId);

    // World 1 Level nodes
    if (y >= cy1 - 20 && y <= cy1 + 20) {
      for (var i = 0; i < 5; i++) {
        var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
        if (x >= cx_node - 20 && x <= cx_node + 20) {
          if (i <= unlockedIdx) {
            Sound.click();
            switchMode('match3', Match3Levels.levels[i].id);
          } else {
            Sound.invalid();
          }
          return;
        }
      }
    }

    // World 2 Level nodes
    var w2Y = 90 + 80 + 14;
    var cy2 = w2Y + 48;
    if (y >= cy2 - 20 && y <= cy2 + 20) {
      for (var i = 0; i < 5; i++) {
        var lvlIdx = i + 5;
        var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
        if (x >= cx_node - 20 && x <= cx_node + 20) {
          if (lvlIdx <= unlockedIdx) {
            Sound.click();
            switchMode('match3', Match3Levels.levels[lvlIdx].id);
          } else {
            Sound.invalid();
          }
          return;
        }
      }
    }

    // World 3 Level nodes
    var w3Y = w2Y + 80 + 14;
    var cy3 = w3Y + 48;
    if (y >= cy3 - 20 && y <= cy3 + 20) {
      for (var i = 0; i < 5; i++) {
        var lvlIdx = i + 10;
        var cx_node = startX + i * (circleW + circleGap) + circleW / 2;
        if (x >= cx_node - 20 && x <= cx_node + 20) {
          if (lvlIdx <= unlockedIdx) {
            Sound.click();
            switchMode('match3', Match3Levels.levels[lvlIdx].id);
          } else {
            Sound.invalid();
          }
          return;
        }
      }
    }

    // 난이도 토글 클릭 판정
    var diffCY = w3Y + 80 + 16;
    var diffTopY = diffCY + 4;
    var diffBtnH = 32;
    var totalW_diff = 220;
    var startX_diff = cw / 2 - totalW_diff / 2 + 2;
    if (y >= diffTopY && y <= diffTopY + diffBtnH) {
      for (var d = 0; d < 3; d++) {
        var bx = startX_diff + d * (totalW_diff / 3) + 1;
        var bw = totalW_diff / 3 - 2;
        if (x >= bx && x <= bx + bw) {
          difficulty = difficultyNames[d];
          saveDifficulty();
          Sound.click();
          return;
        }
      }
    }

    // 설치 배너 클릭 판정
    var recordsY = diffCY + 32 + 16;
    if (deferredPrompt && !installDismissed) {
      var instY = recordsY + 76 + 16;
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
    if (mode === 'match3') {
      Match3.destroy();
      Match3.init(canvas, ctx, goToMenu, difficulty, selectedLevelId);
      Match3.setHighScore(highScores.match3 || 0);
    }
  });

  init();

  return {
    getDifficulty: function () { return difficulty; },
    getHighScores: function () { return highScores; }
  };
})();