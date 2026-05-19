const Match3 = (function () {
  'use strict';

  var COLS = 8, ROWS = 8, GEM = 54, GAP = 3;
  var BOARD_W, BOARD_H, GRID_X, GRID_Y;
  var canvas, ctx, onBack;
  var grid, score, combo, timeLeft, timer;
  var selected, animState, animTimer, matchCells, swapData, removalData;
  var pointerDown, pointerCell, swipeStart;
  var running, gameOverTime;
  var gemColors;

  function init(cnv, ctxt, backCb) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    BOARD_W = COLS * GEM + (COLS - 1) * GAP;
    BOARD_H = ROWS * GEM + (ROWS - 1) * GAP;
    GRID_X = Math.floor((canvas.width - BOARD_W) / 2);
    GRID_Y = 100;

    gemColors = [
      { main: '#FF4757', light: '#FF6B81', dark: '#B71540' },
      { main: '#2ED573', light: '#7BED9F', dark: '#1B7A3D' },
      { main: '#FFA502', light: '#FFBE76', dark: '#B87000' },
      { main: '#A855F7', light: '#C084FC', dark: '#6D28D9' },
      { main: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8' },
      { main: '#EC4899', light: '#F472B6', dark: '#9D174D' }
    ];

    resetGame();
    bindInput();
    running = false;
  }

  function resetGame() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      for (var c = 0; c < COLS; c++) {
        var t;
        do { t = Math.floor(Math.random() * 6); }
        while (wouldMatch(r, c, t));
        grid[r][c] = t;
      }
    }
    score = 0;
    combo = 0;
    timeLeft = 60;
    selected = null;
    animState = 'idle';
    animTimer = 0;
    matchCells = [];
    swapData = null;
    removalData = null;
    pointerDown = false;
    pointerCell = null;
    swipeStart = null;
    gameOverTime = 0;
    Effects.reset();
  }

  function wouldMatch(r, c, type) {
    if (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) return true;
    if (r >= 2 && grid[r - 1] && grid[r - 1][c] === type && grid[r - 2] && grid[r - 2][c] === type) return true;
    return false;
  }

  function getCell(x, y) {
    var cx = x - GRID_X, cy = y - GRID_Y;
    if (cx < -GAP || cy < -GAP) return null;
    var col = Math.floor(cx / (GEM + GAP));
    var row = Math.floor(cy / (GEM + GAP));
    var rx = col * (GEM + GAP), ry = row * (GEM + GAP);
    if (cx >= rx + GEM || cy >= ry + GEM) return null;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    if (animState === 'remove' && removalData) {
      for (var i = 0; i < removalData.length; i++) {
        if (removalData[i].r === row && removalData[i].c === col) return null;
      }
    }
    return { r: row, c: col };
  }

  function cellCenter(r, c) {
    return {
      x: GRID_X + c * (GEM + GAP) + GEM / 2,
      y: GRID_Y + r * (GEM + GAP) + GEM / 2
    };
  }

  function areAdjacent(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function swap(a, b) {
    var tmp = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = tmp;
  }

  function findMatches() {
    var matched = [];
    var seen = {};
    function mark(r, c) {
      var key = r + ',' + c;
      if (seen[key]) return;
      seen[key] = true;
      matched.push({ r: r, c: c });
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS - 2; c++) {
        if (grid[r][c] < 0) continue;
        var t = grid[r][c];
        var end = c;
        while (end + 1 < COLS && grid[r][end + 1] === t) end++;
        if (end - c >= 2) {
          for (var k = c; k <= end; k++) mark(r, k);
        }
        c = Math.max(c, end - 1);
      }
    }
    for (var c = 0; c < COLS; c++) {
      for (var r = 0; r < ROWS - 2; r++) {
        if (grid[r][c] < 0) continue;
        var t = grid[r][c];
        var end = r;
        while (end + 1 < ROWS && grid[end + 1][c] === t) end++;
        if (end - r >= 2) {
          for (var k = r; k <= end; k++) mark(k, c);
        }
        r = Math.max(r, end - 1);
      }
    }
    return matched;
  }

  function applyGravity() {
    for (var c = 0; c < COLS; c++) {
      var writeRow = ROWS - 1;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c] >= 0) {
          grid[writeRow][c] = grid[r][c];
          if (writeRow !== r) grid[r][c] = -1;
          writeRow--;
        }
      }
      while (writeRow >= 0) {
        grid[writeRow][c] = Math.floor(Math.random() * 6);
        writeRow--;
      }
    }
  }

  function beginSwap(a, b) {
    swapData = { a: a, b: b };
    animState = 'swap';
    animTimer = 0.15;
    selected = null;
  }

  function beginSwapBack(a, b) {
    swap(a, b);
    swapData = { a: a, b: b };
    animState = 'swapback';
    animTimer = 0.15;
  }

  function beginRemoval(cells) {
    removalData = [];
    animState = 'remove';
    animTimer = 0.35;
    matchCells = [];

    combo++;
    var baseScore = cells.length * 10 * combo;
    score += baseScore;

    for (var i = 0; i < cells.length; i++) {
      var p = cellCenter(cells[i].r, cells[i].c);
      var gc = gemColors[grid[cells[i].r][cells[i].c]];
      Effects.emit(p.x, p.y, 8, gc.light, { speedMin: 50, speedMax: 140, sizeMin: 3, sizeMax: 7, lifeMin: 0.3, lifeMax: 0.7 });
      removalData.push({ r: cells[i].r, c: cells[i].c, type: grid[cells[i].r][cells[i].c] });
    }
    Effects.shake(combo * 1.5);

    for (var j = 0; j < cells.length; j++) {
      grid[cells[j].r][cells[j].c] = -1;
    }
  }

  function update(dt) {
    if (animState === 'gameover') {
      gameOverTime += dt;
      Effects.update(dt);
      return;
    }

    if (timeLeft > 0 && animState !== 'remove' && animState !== 'swap' && animState !== 'swapback') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        animState = 'gameover';
        gameOverTime = 0;
        Effects.emit(canvas.width / 2, canvas.height / 2, 40, '#FFD700', {
          speedMin: 80, speedMax: 250, lifeMin: 0.5, lifeMax: 1.5, sizeMin: 3, sizeMax: 8
        });
        return;
      }
    }

    if (animState === 'swap' || animState === 'swapback') {
      animTimer -= dt;
      if (animTimer <= 0) {
        if (animState === 'swapback') {
          animState = 'idle';
          swapData = null;
        } else {
          var matches = findMatches();
          if (matches.length > 0) {
            beginRemoval(matches);
          } else {
            beginSwapBack(swapData.a, swapData.b);
          }
        }
      }
    }

    if (animState === 'remove') {
      animTimer -= dt;
      if (animTimer <= 0) {
        applyGravity();
        removalData = null;
        combo = 0;
        var newMatches = findMatches();
        if (newMatches.length > 0) {
          beginRemoval(newMatches);
        } else {
          animState = 'idle';
        }
      }
    }

    Effects.update(dt);
  }

  function render() {
    var shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawBoard();
    drawTimerAndScore();

    if (animState === 'swap' || animState === 'swapback') {
      drawSwapAnimation();
    }
    if (animState === 'remove') {
      drawRemovalAnimation();
    }

    Effects.render(ctx);

    if (animState === 'gameover') {
      drawGameOver();
    }

    ctx.restore();
  }

  function drawBoard() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var skip = false;
        if ((animState === 'remove') && removalData) {
          for (var i = 0; i < removalData.length; i++) {
            if (removalData[i].r === r && removalData[i].c === c) { skip = true; break; }
          }
        }
        if (skip) continue;
        if (grid[r][c] < 0) continue;

        var sx = GRID_X + c * (GEM + GAP);
        var sy = GRID_Y + r * (GEM + GAP);

        if (animState === 'swap' && swapData) {
          var a = swapData.a, b = swapData.b;
          var progress = 1 - (animTimer / 0.15);
          var ease = progress * (2 - progress);
          if (r === a.r && c === a.c) {
            sx += (b.c - a.c) * (GEM + GAP) * ease;
            sy += (b.r - a.r) * (GEM + GAP) * ease;
          } else if (r === b.r && c === b.c) {
            sx += (a.c - b.c) * (GEM + GAP) * ease;
            sy += (a.r - b.r) * (GEM + GAP) * ease;
          }
        }
        if (animState === 'swapback' && swapData) {
          var a2 = swapData.a, b2 = swapData.b;
          var p2 = 1 - (animTimer / 0.15);
          var e2 = p2 * (2 - p2);
          if (r === a2.r && c === a2.c) {
            sx += (b2.c - a2.c) * (GEM + GAP) * (1 - e2);
            sy += (b2.r - a2.r) * (GEM + GAP) * (1 - e2);
          } else if (r === b2.r && c === b2.c) {
            sx += (a2.c - b2.c) * (GEM + GAP) * (1 - e2);
            sy += (a2.r - b2.r) * (GEM + GAP) * (1 - e2);
          }
        }

        drawGem(sx, sy, GEM, grid[r][c], 1);
      }
    }

    if (selected && animState === 'idle') {
      var sc = cellCenter(selected.r, selected.c);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(sc.x - GEM / 2, sc.y - GEM / 2, GEM, GEM, 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawSwapAnimation() {
    return;
  }

  function drawRemovalAnimation() {
    if (!removalData) return;
    var progress = 1 - (animTimer / 0.35);
    for (var i = 0; i < removalData.length; i++) {
      var rd = removalData[i];
      var cx = GRID_X + rd.c * (GEM + GAP);
      var cy = GRID_Y + rd.r * (GEM + GAP);
      var scale = 1 - progress;
      var alpha = 1 - progress;
      if (scale <= 0) continue;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx + GEM / 2, cy + GEM / 2);
      ctx.scale(scale, scale);
      drawGem(-GEM / 2, -GEM / 2, GEM, rd.type >= 0 ? rd.type : 0, alpha);
      ctx.restore();
    }
  }

  var gemCache = {};
  function drawGem(x, y, size, type, alpha) {
    var key = type + '_' + size;
    if (!gemCache[key]) {
      var off = document.createElement('canvas');
      off.width = size + 4; off.height = size + 4;
      var oc = off.getContext('2d');
      var gc = gemColors[type];
      var cx = size / 2 + 2, cy = size / 2 + 2;

      oc.shadowColor = 'rgba(0,0,0,0.3)';
      oc.shadowBlur = 3;
      oc.shadowOffsetX = 1;
      oc.shadowOffsetY = 2;

      var grad = oc.createLinearGradient(cx - size * 0.4, cy - size * 0.4, cx + size * 0.4, cy + size * 0.4);
      grad.addColorStop(0, gc.light);
      grad.addColorStop(0.45, gc.main);
      grad.addColorStop(1, gc.dark);
      oc.fillStyle = grad;
      oc.beginPath();
      oc.roundRect(cx - size / 2, cy - size / 2, size, size, 10);
      oc.fill();

      oc.shadowBlur = 0;
      oc.shadowOffsetX = 0;
      oc.shadowOffsetY = 0;

      var hgrad = oc.createRadialGradient(cx - size * 0.15, cy - size * 0.2, size * 0.05, cx, cy, size * 0.5);
      hgrad.addColorStop(0, 'rgba(255,255,255,0.7)');
      hgrad.addColorStop(0.4, 'rgba(255,255,255,0.15)');
      hgrad.addColorStop(1, 'rgba(0,0,0,0)');
      oc.fillStyle = hgrad;
      oc.beginPath();
      oc.roundRect(cx - size / 2 + 2, cy - size / 2 + 2, size - 4, size - 4, 8);
      oc.fill();

      var shine = oc.createRadialGradient(cx - size * 0.2, cy - size * 0.25, size * 0.02, cx - size * 0.05, cy - size * 0.1, size * 0.18);
      shine.addColorStop(0, 'rgba(255,255,255,0.9)');
      shine.addColorStop(1, 'rgba(255,255,255,0)');
      oc.fillStyle = shine;
      oc.beginPath();
      oc.ellipse(cx - size * 0.12, cy - size * 0.18, size * 0.18, size * 0.13, -0.4, 0, Math.PI * 2);
      oc.fill();

      gemCache[key] = off;
    }
    ctx.drawImage(gemCache[key], x - 2, y - 2);
  }

  function drawTimerAndScore() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, 85);

    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, 20, 32);

    ctx.textAlign = 'right';
    var tColor = timeLeft <= 10 ? '#FF4757' : '#FFFFFF';
    ctx.fillStyle = tColor;
    ctx.fillText('Time: ' + Math.ceil(timeLeft) + 's', canvas.width - 20, 32);

    if (combo > 1 && animState === 'remove') {
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('COMBO x' + combo + '!', canvas.width / 2, 64);
    }

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Back', 20, 60);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Time\'s Up!', canvas.width / 2, canvas.height / 2 - 30);

    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);

    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Tap to go back', canvas.width / 2, canvas.height / 2 + 60);
  }

  function handlePointer(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var x = (e.clientX - rect.left) * scaleX;
    var y = (e.clientY - rect.top) * scaleY;
    return { x: x, y: y };
  }

  function onDown(e) {
    var p = handlePointer(e.touches ? e.touches[0] : e);
    if (animState === 'gameover') {
      onBack();
      return;
    }
    if (p.y < 85) {
      if (p.x < 60) { onBack(); return; }
      return;
    }
    if (animState !== 'idle') return;
    var cell = getCell(p.x, p.y);
    if (!cell) { selected = null; return; }
    pointerCell = cell;
    swipeStart = { x: p.x, y: p.y, cell: cell };
    selected = cell;
    pointerDown = true;
  }

  function onUp(e) {
    if (!pointerDown) return;
    pointerDown = false;
    if (animState !== 'idle') return;
    if (!selected) return;

    if (swipeStart && swipeStart.cell) {
      var endP = handlePointer(e.changedTouches ? e.changedTouches[0] : e);
      var dx = endP.x - swipeStart.x;
      var dy = endP.y - swipeStart.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        var dirR = 0, dirC = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          dirC = dx > 0 ? 1 : -1;
        } else {
          dirR = dy > 0 ? 1 : -1;
        }
        var target = { r: selected.r + dirR, c: selected.c + dirC };
        if (target.r >= 0 && target.r < ROWS && target.c >= 0 && target.c < COLS) {
          var a = { r: selected.r, c: selected.c };
          swap(a, target);
          beginSwap(a, target);
          swipeStart = null;
          return;
        }
      }

      if (pointerCell && pointerCell.r === selected.r && pointerCell.c === selected.c) {
        if (areAdjacent(swipeStart.cell, selected)) {
          var a2 = { r: swipeStart.cell.r, c: swipeStart.cell.c };
          var b2 = { r: selected.r, c: selected.c };
          if (a2.r !== b2.r || a2.c !== b2.c) {
            swap(a2, b2);
            beginSwap(a2, b2);
            swipeStart = null;
            return;
          }
        }
      }
    }

    selected = null;
    swipeStart = null;
    pointerCell = null;
  }

  function onMove(e) {
    if (!pointerDown || !selected) return;
    var p = handlePointer(e.touches ? e.touches[0] : e);
    pointerCell = getCell(p.x, p.y);
  }

  function bindInput() {
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('touchmove', onMove, { passive: false });
  }

  function unbindInput() {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchend', onUp);
    canvas.removeEventListener('touchmove', onMove);
  }

  function destroy() {
    unbindInput();
    running = false;
    gemCache = {};
    Effects.reset();
  }

  function getScore() {
    return score;
  }

  return {
    init: init,
    destroy: destroy,
    update: update,
    render: render,
    getScore: getScore
  };
})();
