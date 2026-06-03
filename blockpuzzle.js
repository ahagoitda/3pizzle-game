const BlockPuzzle = (function () {
  'use strict';

  var ROWS = 10, COLS = 10, CELL = 40, GAP = 2;
  var BOARD_W, BOARD_H, GRID_X, GRID_Y, PREVIEW_Y;
  var canvas, ctx, onBack;
  var board, score, blocks, selectedBlock, gameOver, animClearing, clearTimer, clearTimeoutId;
  var pointerDown, draggingBlock, dragR, dragC;
  var blockColors;
  var clearingRows, clearingCols;
  var comboCount;
  var highScore;
  var scorePopups;
  var shapes, shapeColors;

  function init(cnv, ctxt, backCb) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    BOARD_W = COLS * CELL + (COLS - 1) * GAP;
    BOARD_H = ROWS * CELL + (ROWS - 1) * GAP;
    GRID_X = Math.floor((canvas.width - BOARD_W) / 2);
    GRID_Y = 70;
    PREVIEW_Y = GRID_Y + BOARD_H + 20;

    shapes = [
      [[0, 0]],
      [[0, 0], [0, 1]],
      [[0, 0], [1, 0]],
      [[0, 0], [0, 1], [0, 2]],
      [[0, 0], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1]],
      [[0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0]],
      [[0, 0], [0, 1], [1, 1]],
      [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 0], [1, 0], [2, 0], [3, 0]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[0, 0], [0, 1], [0, 2], [1, 0]],
      [[0, 0], [1, 0], [2, 0], [2, 1]],
      [[0, 1], [1, 1], [2, 0], [2, 1]]
    ];

    shapeColors = [
      '#A855F7', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
      '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#8B5CF6',
      '#06B6D4', '#84CC16', '#E11D48', '#7C3AED', '#0EA5E9', '#F43F5E'
    ];

    blockColors = [
      { main: '#A855F7', light: '#C084FC', dark: '#6D28D9' },
      { main: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8' },
      { main: '#10B981', light: '#34D399', dark: '#047857' },
      { main: '#F59E0B', light: '#FBBF24', dark: '#B45309' },
      { main: '#EF4444', light: '#F87171', dark: '#B91C1C' },
      { main: '#EC4899', light: '#F472B6', dark: '#9D174D' }
    ];

    resetGame();
    bindInput();
  }

  function resetGame() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      for (var c = 0; c < COLS; c++) {
        board[r][c] = -1;
      }
    }
    score = 0;
    selectedBlock = -1;
    gameOver = false;
    animClearing = false;
    clearTimer = 0;
    draggingBlock = -1;
    dragR = -1;
    dragC = -1;
    clearingRows = [];
    clearingCols = [];
    comboCount = 0;
    scorePopups = [];
    blocks = generateBlocks(3);
    Effects.reset();
    checkGameOver();
  }

  function generateBlocks(count) {
    var result = [];
    for (var i = 0; i < count; i++) {
      var idx = Math.floor(Math.random() * shapes.length);
      result.push({ shape: shapes[idx], color: idx % blockColors.length });
    }
    return result;
  }

  function canPlace(block, br, bc) {
    var shape = block.shape;
    for (var i = 0; i < shape.length; i++) {
      var r = br + shape[i][0];
      var c = bc + shape[i][1];
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
      if (board[r][c] >= 0) return false;
    }
    return true;
  }

  function placeBlock(blockIdx, br, bc) {
    var block = blocks[blockIdx];
    if (!block) return false;
    if (!canPlace(block, br, bc)) return false;

    Sound.place();

    for (var i = 0; i < block.shape.length; i++) {
      var r = br + block.shape[i][0];
      var c = bc + block.shape[i][1];
      board[r][c] = block.color;
    }

    blocks[blockIdx] = null;

    var points = block.shape.length * 3;
    var cleared = findFullLines();
    if (cleared.rows.length > 0 || cleared.cols.length > 0) {
      var clearedCells = {};
      for (var ri = 0; ri < cleared.rows.length; ri++) {
        for (var cc = 0; cc < COLS; cc++) {
          var key = cleared.rows[ri] + ',' + cc;
          if (board[cleared.rows[ri]][cc] >= 0) clearedCells[key] = true;
        }
      }
      for (var ci = 0; ci < cleared.cols.length; ci++) {
        for (var rr = 0; rr < ROWS; rr++) {
          var key2 = rr + ',' + cleared.cols[ci];
          if (board[rr][cleared.cols[ci]] >= 0) clearedCells[key2] = true;
        }
      }
      var cellCount = Object.keys(clearedCells).length;
      var lineCount = cleared.rows.length + cleared.cols.length;
      comboCount++;
      var comboMultiplier = comboCount;
      points += cellCount * 5 * lineCount * comboMultiplier;
      startClearAnimation(cleared);
      Sound.clear();
    } else {
      comboCount = 0;
    }

    score += points;

    if (points > 0) {
      var popX = GRID_X + BOARD_W / 2;
      var popY = GRID_Y + BOARD_H / 2 - 30;
      var popText = '+' + points;
      if (comboCount > 1) popText += ' x' + comboCount;
      scorePopups.push({ x: popX, y: popY, text: popText, life: 1.0, maxLife: 1.0, color: comboCount > 1 ? '#FFD700' : '#FFFFFF' });
    }

    var placedCells = [];
    for (var j = 0; j < block.shape.length; j++) {
      var pr = br + block.shape[j][0], pc = bc + block.shape[j][1];
      placedCells.push({ r: pr, c: pc });
    }
    var gc = blockColors[block.color];
    for (var k = 0; k < placedCells.length; k++) {
      var px = GRID_X + placedCells[k].c * (CELL + GAP) + CELL / 2;
      var py = GRID_Y + placedCells[k].r * (CELL + GAP) + CELL / 2;
      Effects.emit(px, py, 5, gc.light, { speedMin: 30, speedMax: 100, sizeMin: 2, sizeMax: 5, lifeMin: 0.2, lifeMax: 0.5 });
    }

    selectedBlock = -1;
    refillBlocks();
    checkGameOver();
    return true;
  }

  function findFullLines() {
    var fullRows = [], fullCols = [];
    for (var r = 0; r < ROWS; r++) {
      var full = true;
      for (var c = 0; c < COLS; c++) {
        if (board[r][c] < 0) { full = false; break; }
      }
      if (full) fullRows.push(r);
    }
    for (var c = 0; c < COLS; c++) {
      var full = true;
      for (var r = 0; r < ROWS; r++) {
        if (board[r][c] < 0) { full = false; break; }
      }
      if (full) fullCols.push(c);
    }
    return { rows: fullRows, cols: fullCols };
  }

  function startClearAnimation(cleared) {
    animClearing = true;
    clearTimer = 0.4;
    clearingRows = cleared.rows.slice();
    clearingCols = cleared.cols.slice();

    for (var i = 0; i < cleared.rows.length; i++) {
      var ry = GRID_Y + cleared.rows[i] * (CELL + GAP) + CELL / 2;
      for (var cc = 0; cc < COLS; cc++) {
        if (board[cleared.rows[i]][cc] >= 0) {
          var cx = GRID_X + cc * (CELL + GAP) + CELL / 2;
          Effects.emit(cx, ry, 4, '#FFD700', { speedMin: 30, speedMax: 80, sizeMin: 2, sizeMax: 5, lifeMin: 0.3, lifeMax: 0.6 });
        }
      }
      Effects.emitLine(GRID_X, ry, GRID_X + BOARD_W, ry, 15, '#FFD700', { speedMin: 40, speedMax: 120, sizeMin: 2, sizeMax: 6 });
    }
    for (var j = 0; j < cleared.cols.length; j++) {
      var cx2 = GRID_X + cleared.cols[j] * (CELL + GAP) + CELL / 2;
      for (var rr = 0; rr < ROWS; rr++) {
        if (board[rr][cleared.cols[j]] >= 0) {
          var cy = GRID_Y + rr * (CELL + GAP) + CELL / 2;
          Effects.emit(cx2, cy, 4, '#FFD700', { speedMin: 30, speedMax: 80, sizeMin: 2, sizeMax: 5, lifeMin: 0.3, lifeMax: 0.6 });
        }
      }
      Effects.emitLine(cx2, GRID_Y, cx2, GRID_Y + BOARD_H, 15, '#FFD700', { speedMin: 40, speedMax: 120, sizeMin: 2, sizeMax: 6 });
    }
    Effects.shake(3 + comboCount * 2);

    var clearRows = cleared.rows;
    var clearCols = cleared.cols;
    clearTimeoutId = setTimeout(function () {
      for (var ri = 0; ri < clearRows.length; ri++) {
        for (var c = 0; c < COLS; c++) {
          board[clearRows[ri]][c] = -1;
        }
      }
      for (var ci = 0; ci < clearCols.length; ci++) {
        for (var r = 0; r < ROWS; r++) {
          board[r][clearCols[ci]] = -1;
        }
      }
      animClearing = false;
      clearingRows = [];
      clearingCols = [];
      clearTimeoutId = null;
    }, 400);
  }

  function refillBlocks() {
    var remaining = [];
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i] !== null) remaining.push(blocks[i]);
    }
    while (remaining.length < 3) {
      var idx = Math.floor(Math.random() * shapes.length);
      remaining.push({ shape: shapes[idx], color: idx % blockColors.length });
    }
    blocks = remaining;
  }

  function checkGameOver() {
    var hasSpace = false;
    for (var i = 0; i < blocks.length; i++) {
      if (blocks[i] === null) continue;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (canPlace(blocks[i], r, c)) { hasSpace = true; break; }
        }
        if (hasSpace) break;
      }
      if (hasSpace) break;
    }
    if (!hasSpace) {
      gameOver = true;
      Sound.gameover();
      Effects.emit(canvas.width / 2, canvas.height / 2, 30, '#FF4757', { speedMin: 60, speedMax: 200 });
    }
  }

  function getCell(x, y) {
    var cx = x - GRID_X, cy = y - GRID_Y;
    var col = Math.floor(cx / (CELL + GAP));
    var row = Math.floor(cy / (CELL + GAP));
    var rx = col * (CELL + GAP), ry = row * (CELL + GAP);
    if (cx < 0 || cy < 0 || cx >= rx + CELL || cy >= ry + CELL) return null;
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { r: row, c: col };
  }

  function handlePointer(e) {
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (canvas.width / rect.width);
    var y = (e.clientY - rect.top) * (canvas.height / rect.height);
    return { x: x, y: y };
  }

  function getPreviewBlockIndex(x, y) {
    if (y < PREVIEW_Y) return -1;
    var gap = 12;
    var previewCell = 28;
    var startX = GRID_X + Math.floor((BOARD_W - (3 * (previewCell * 3 + 8) + 2 * gap)) / 2);
    for (var i = 0; i < 3; i++) {
      if (blocks[i] === null) continue;
      var bw = previewCell * 3, bh = previewCell * 3;
      var bx = startX + i * (bw + gap);
      var by = PREVIEW_Y + 10;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return i;
    }
    return -1;
  }

  function onDown(e) {
    var p = handlePointer(e.touches ? e.touches[0] : e);
    if (gameOver) {
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var btnW = 200, btnH = 50, btnY = cy + 40;
      var btn2Y = btnY + btnH + 15;
      if (p.x >= cx - btnW / 2 && p.x <= cx + btnW / 2) {
        if (p.y >= btnY && p.y <= btnY + btnH) {
          resetGame();
          return;
        }
        if (p.y >= btn2Y && p.y <= btn2Y + btnH) {
          onBack();
          return;
        }
      }
      return;
    }
    if (p.y < 55 && p.x < 60) { onBack(); return; }

    var previewIdx = getPreviewBlockIndex(p.x, p.y);
    if (previewIdx >= 0) {
      selectedBlock = previewIdx;
      draggingBlock = previewIdx;
      return;
    }

    if (selectedBlock >= 0) {
      var cell = getCell(p.x, p.y);
      if (cell) {
        if (selectedBlock >= 0 && selectedBlock < blocks.length && blocks[selectedBlock] !== null) {
          var block = blocks[selectedBlock];
          var br = Math.round(cell.r - block.shape[0][0]);
          var bc = Math.round(cell.c - block.shape[0][1]);
          placeBlock(selectedBlock, br, bc);
        }
      } else {
        selectedBlock = -1;
        draggingBlock = -1;
      }
    }
  }

  function onMove(e) {
    if (draggingBlock < 0) return;
    var p = handlePointer(e.touches ? e.touches[0] : e);
    var cell = getCell(p.x, p.y);
    if (cell) {
      var block = blocks[draggingBlock];
      if (block) {
        dragR = Math.round(cell.r - block.shape[0][0]);
        dragC = Math.round(cell.c - block.shape[0][1]);
      }
    }
  }

  function onUp(e) {
    if (draggingBlock >= 0) {
      if (dragR >= 0 && dragC >= 0) {
        placeBlock(draggingBlock, dragR, dragC);
      }
      draggingBlock = -1;
      dragR = -1;
      dragC = -1;
    }
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

  function update(dt) {
    if (animClearing) {
      clearTimer -= dt;
      if (clearTimer <= 0) animClearing = false;
    }
    for (var i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].life -= dt;
      scorePopups[i].y -= 30 * dt;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }
    Effects.update(dt);
  }

  function render() {
    var shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawHeader();
    drawBoard();
    drawPreview();
    if (draggingBlock >= 0 && dragR >= 0 && dragC >= 0) {
      drawGhost(draggingBlock, dragR, dragC);
    }
    Effects.render(ctx);

    drawScorePopups();

    if (gameOver) drawGameOver();

    ctx.restore();
  }

  function drawHeader() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, 55);

    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, 20, 28);

    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Back', 20, 48);

    if (comboCount > 1) {
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.fillText('COMBO x' + comboCount + '!', canvas.width / 2, 28);
    }
  }

  function drawBoard() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GRID_X + c * (CELL + GAP);
        var y = GRID_Y + r * (CELL + GAP);

        if (board[r][c] >= 0) {
          drawCell(x, y, CELL, board[r][c], (animClearing && isClearing(r, c)) ? 0.5 : 1);
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath();
          ctx.roundRect(x, y, CELL, CELL, 4);
          ctx.fill();
        }
      }
    }
  }

  function isClearing(r, c) {
    for (var i = 0; i < clearingRows.length; i++) {
      if (clearingRows[i] === r) return true;
    }
    for (var j = 0; j < clearingCols.length; j++) {
      if (clearingCols[j] === c) return true;
    }
    return false;
  }

  function drawCell(x, y, size, colorIdx, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    var bc = blockColors[colorIdx];

    var grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, bc.light);
    grad.addColorStop(0.5, bc.main);
    grad.addColorStop(1, bc.dark);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, size - 4, size / 2 - 2, [4, 4, 0, 0]);
    ctx.fill();

    ctx.restore();
  }

  function drawPreview() {
    var gap = 16;
    var previewCell = 26;
    var areaW = 3 * (previewCell * 3 + 8) + 2 * gap;
    var startX = GRID_X + Math.floor((BOARD_W - areaW) / 2);

    for (var i = 0; i < 3; i++) {
      var bw = previewCell * 3 + 8, bh = previewCell * 3 + 8;
      var bx = startX + i * (bw + gap);
      var by = PREVIEW_Y + 10;

      ctx.fillStyle = selectedBlock === i ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();

      if (selectedBlock === i) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.stroke();
      }

      if (blocks[i] === null) continue;
      var shape = blocks[i].shape;
      var offsetR = 0, offsetC = 0;
      var minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
      for (var j = 0; j < shape.length; j++) {
        if (shape[j][0] < minR) minR = shape[j][0];
        if (shape[j][1] < minC) minC = shape[j][1];
        if (shape[j][0] > maxR) maxR = shape[j][0];
        if (shape[j][1] > maxC) maxC = shape[j][1];
      }
      var shapeW = (maxC - minC + 1) * previewCell;
      var shapeH = (maxR - minR + 1) * previewCell;
      var offsetX = bx + (bw - shapeW) / 2;
      var offsetY = by + (bh - shapeH) / 2;

      for (var k = 0; k < shape.length; k++) {
        var sx = offsetX + (shape[k][1] - minC) * previewCell;
        var sy = offsetY + (shape[k][0] - minR) * previewCell;
        var bc = blockColors[blocks[i].color];
        var g = ctx.createLinearGradient(sx, sy, sx + previewCell, sy + previewCell);
        g.addColorStop(0, bc.light);
        g.addColorStop(0.5, bc.main);
        g.addColorStop(1, bc.dark);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(sx + 1, sy + 1, previewCell - 2, previewCell - 2, 4);
        ctx.fill();
      }
    }
  }

  function drawGhost(blockIdx, br, bc) {
    if (blockIdx < 0 || !blocks[blockIdx]) return;
    var block = blocks[blockIdx];
    var canP = canPlace(block, br, bc);
    var ghostColor = canP ? block.color : -1;

    ctx.globalAlpha = 0.4;
    for (var i = 0; i < block.shape.length; i++) {
      var r = br + block.shape[i][0];
      var c = bc + block.shape[i][1];
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      var x = GRID_X + c * (CELL + GAP);
      var y = GRID_Y + r * (CELL + GAP);
      if (canP) {
        drawCell(x, y, CELL, ghostColor, 0.4);
      } else {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x, y, CELL, CELL, 6);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#FF4757';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FF4757';
    ctx.fillText('Game Over!', cx, cy - 80);
    ctx.shadowBlur = 0;

    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, cx, cy - 30);

    if (highScore !== undefined && highScore !== null) {
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillStyle = score >= highScore ? '#FFD700' : '#aaa';
      ctx.fillText(score >= highScore ? 'New High Score!' : 'Best: ' + highScore, cx, cy + 10);
    }

    var btnW = 200, btnH = 50, btnY = cy + 40;
    ctx.fillStyle = 'rgba(96, 165, 250, 0.9)';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Retry', cx, btnY + btnH / 2);

    var btn2Y = btnY + btnH + 15;
    ctx.fillStyle = 'rgba(100, 100, 120, 0.7)';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Menu', cx, btn2Y + btnH / 2);
  }

  function drawScorePopups() {
    for (var i = 0; i < scorePopups.length; i++) {
      var sp = scorePopups[i];
      var alpha = Math.max(0, sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 6;
      ctx.fillStyle = sp.color;
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function destroy() {
    if (clearTimeoutId) { clearTimeout(clearTimeoutId); clearTimeoutId = null; }
    unbindInput();
    Effects.reset();
  }

  function getScore() {
    return score;
  }

  function setHighScore(hs) {
    highScore = hs;
  }

  return {
    init: init,
    destroy: destroy,
    update: update,
    render: render,
    getScore: getScore,
    setHighScore: setHighScore
  };
})();
