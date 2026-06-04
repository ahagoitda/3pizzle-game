const BlockPuzzle = (function () {
  'use strict';

  var ROWS = 10, COLS = 10, CELL = 40, GAP = 2;
  var BOARD_W, BOARD_H, GRID_X, GRID_Y, PREVIEW_Y;
var canvas, ctx, onBack;
  var board, boardMask, score, blocks, selectedBlock, gameOver, animClearing, clearTimer, clearTimeoutId;
  var pointerDown, draggingBlock, dragR, dragC;
  var blockColors;
  var clearingRows, clearingCols;
  var comboCount;
  var highScore;
  var scorePopups;
  var difficulty;
  var gameState;
  var currentStage;
  var menuPulse2;
  var shapes;
  var shapeColors;

  var boardShapes = [
    {
      name: 'Square',
      unlock: 0,
      mask: [
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
        '##########',
        '##########'
      ]
    },
    {
      name: 'Cross',
      unlock: 500,
      mask: [
        '...####...',
        '...####...',
        '...####...',
        '##########',
        '##########',
        '##########',
        '##########',
        '...####...',
        '...####...',
        '...####...'
      ]
    },
    {
      name: 'Diamond',
      unlock: 1500,
      mask: [
        '....##....',
        '..######..',
        '.########.',
        '##########',
        '##########',
        '##########',
        '##########',
        '.########.',
        '..######..',
        '....##....'
      ]
    },
    {
      name: 'Heart',
      unlock: 3000,
      mask: [
        '.##....##.',
        '########..',
        '##########',
        '##########',
        '##########',
        '.########.',
        '..######..',
        '...####...',
        '....##....',
        '..........'
      ]
    },
    {
      name: 'L-Shape',
      unlock: 5000,
      mask: [
        '##........',
        '##........',
        '##........',
        '##........',
        '##........',
        '##........',
        '##........',
        '##########',
        '##########',
        '##########'
      ]
    },
    {
      name: 'T-Shape',
      unlock: 8000,
      mask: [
        '##########',
        '##########',
        '##########',
        '...####...',
        '...####...',
        '...####...',
        '...####...',
        '...####...',
        '...####...',
        '...####...'
      ]
    },
    {
      name: 'Arrow',
      unlock: 12000,
      mask: [
        '....##....',
        '..######...',
        '.########.',
        '##########',
        '..######...',
        '..######...',
        '..######...',
        '..######...',
        '..######...',
        '..######...'
      ]
    },
    {
      name: 'Circle',
      unlock: 20000,
      mask: [
        '...####...',
        '.########.',
        '.########.',
        '##########',
        '##########',
        '##########',
        '##########',
        '.########.',
        '.########.',
        '...####...'
      ]
    }
  ];

  function parseMask(maskStr) {
    var result = [];
    for (var r = 0; r < maskStr.length; r++) {
      result[r] = [];
      for (var c = 0; c < maskStr[r].length; c++) {
        result[r][c] = maskStr[r][c] === '#';
      }
    }
    return result;
  }

  function init(cnv, ctxt, backCb, diff) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    difficulty = diff || 'normal';
    CELL = 40;
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

    if (!gameState) {
      gameState = 'stageselect';
      currentStage = 0;
    } else if (gameState === 'playing') {
      boardMask = parseMask(boardShapes[currentStage].mask);
      resetGame();
      gameState = 'playing';
    }
    menuPulse2 = 0;

    bindInput();
    render();
  }

  function isStageUnlocked(idx) {
    if (idx === 0) return true;
    return (highScore || 0) >= boardShapes[idx].unlock;
  }

  function startGame(stageIdx) {
    currentStage = stageIdx;
    boardMask = parseMask(boardShapes[stageIdx].mask);
    resetGame();
    gameState = 'playing';
  }

  function resetGame() {
    board = [];
    for (var r = 0; r < ROWS; r++) {
      board[r] = [];
      for (var c = 0; c < COLS; c++) {
        board[r][c] = boardMask[r][c] ? -1 : -2;
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
    var minIdx = 0;
    var maxIdx = shapes.length;
    if (difficulty === 'easy') {
      minIdx = 0;
      maxIdx = 10;
    } else if (difficulty === 'hard') {
      minIdx = 5;
      maxIdx = shapes.length;
    }
    for (var i = 0; i < count; i++) {
      var range = maxIdx - minIdx;
      var idx = minIdx + Math.floor(Math.random() * range);
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
      if (!boardMask[r][c]) return false;
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
          if (boardMask[cleared.rows[ri]][cc] && board[cleared.rows[ri]][cc] >= 0) clearedCells[key] = true;
        }
      }
      for (var ci = 0; ci < cleared.cols.length; ci++) {
        for (var rr = 0; rr < ROWS; rr++) {
          var key2 = rr + ',' + cleared.cols[ci];
          if (boardMask[rr][cleared.cols[ci]] && board[rr][cleared.cols[ci]] >= 0) clearedCells[key2] = true;
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
        if (!boardMask[r][c]) continue;
        if (board[r][c] < 0) { full = false; break; }
      }
      if (full) {
        var hasActive = false;
        for (var c2 = 0; c2 < COLS; c2++) { if (boardMask[r][c2]) { hasActive = true; break; } }
        if (hasActive) fullRows.push(r);
      }
    }
    for (var c3 = 0; c3 < COLS; c3++) {
      var full2 = true;
      for (var r2 = 0; r2 < ROWS; r2++) {
        if (!boardMask[r2][c3]) continue;
        if (board[r2][c3] < 0) { full2 = false; break; }
      }
      if (full2) {
        var hasActive2 = false;
        for (var r3 = 0; r3 < ROWS; r3++) { if (boardMask[r3][c3]) { hasActive2 = true; break; } }
        if (hasActive2) fullCols.push(c3);
      }
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
        if (boardMask[cleared.rows[i]][cc] && board[cleared.rows[i]][cc] >= 0) {
          var cx = GRID_X + cc * (CELL + GAP) + CELL / 2;
          Effects.emit(cx, ry, 4, '#FFD700', { speedMin: 30, speedMax: 80, sizeMin: 2, sizeMax: 5, lifeMin: 0.3, lifeMax: 0.6 });
        }
      }
      Effects.emitLine(GRID_X, ry, GRID_X + BOARD_W, ry, 15, '#FFD700', { speedMin: 40, speedMax: 120, sizeMin: 2, sizeMax: 6 });
    }
    for (var j = 0; j < cleared.cols.length; j++) {
      var cx2 = GRID_X + cleared.cols[j] * (CELL + GAP) + CELL / 2;
      for (var rr = 0; rr < ROWS; rr++) {
        if (boardMask[rr][cleared.cols[j]] && board[rr][cleared.cols[j]] >= 0) {
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
          if (boardMask[clearRows[ri]][c]) board[clearRows[ri]][c] = -1;
        }
      }
      for (var ci = 0; ci < clearCols.length; ci++) {
        for (var r = 0; r < ROWS; r++) {
          if (boardMask[r][clearCols[ci]]) board[r][clearCols[ci]] = -1;
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
      var minIdx = 0, maxIdx = shapes.length;
      if (difficulty === 'easy') { minIdx = 0; maxIdx = 10; }
      else if (difficulty === 'hard') { minIdx = 5; maxIdx = shapes.length; }
      var range = maxIdx - minIdx;
      var idx = minIdx + Math.floor(Math.random() * range);
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
    if (!boardMask[row][col]) return null;
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
    var gap = 16;
    var previewCell = 26;
    var areaW = 3 * (previewCell * 3 + 8) + 2 * gap;
    var startX = GRID_X + Math.floor((BOARD_W - areaW) / 2);
    for (var i = 0; i < 3; i++) {
      if (blocks[i] === null) continue;
      var bw = previewCell * 3 + 8, bh = previewCell * 3 + 8;
      var bx = startX + i * (bw + gap);
      var by = PREVIEW_Y + 10;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return i;
    }
    return -1;
  }

  function onDown(e) {
    var p = handlePointer(e.touches ? e.touches[0] : e);

    if (gameState === 'stageselect') {
      handleStageSelectClick(p);
      return;
    }

    if (gameOver) {
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var btnW = 200, btnH = 46, btnY = cy - 5;
      var btn2Y = btnY + btnH + 10;
      var btn3Y = btn2Y + btnH + 10;
      if (p.x >= cx - btnW / 2 && p.x <= cx + btnW / 2) {
        if (p.y >= btnY && p.y <= btnY + btnH) {
          resetGame();
          return;
        }
        if (p.y >= btn2Y && p.y <= btn2Y + btnH) {
          gameState = 'stageselect';
          return;
        }
        if (p.y >= btn3Y && p.y <= btn3Y + btnH) {
          onBack();
          return;
        }
      }
      return;
    }
    if (p.y < 55 && p.x < 60) {
      gameState = 'stageselect';
      return;
    }

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

  function handleStageSelectClick(p) {
    var cx = canvas.width / 2;
    var cellSize = 16;
    var gap2 = 2;
    var cardW = 4 * (cellSize + gap2) + 16;
    var cardH = 4 * (cellSize + gap2) + 38;
    var cols2 = 2;
    var cardGap = 10;
    var totalW = cols2 * cardW + (cols2 - 1) * cardGap;
    var startX = cx - totalW / 2;
    var startY = 105;

    var backY = canvas.height - 40;
    if (p.y >= backY - 16 && p.y <= backY + 16 && p.x >= cx - 60 && p.x <= cx + 60) {
      onBack();
      return;
    }

    for (var i = 0; i < boardShapes.length; i++) {
      var row2 = Math.floor(i / cols2);
      var col2 = i % cols2;
      var bx = startX + col2 * (cardW + cardGap);
      var by = startY + row2 * (cardH + cardGap);
      if (p.x >= bx && p.x <= bx + cardW && p.y >= by && p.y <= by + cardH) {
        if (isStageUnlocked(i)) {
          startGame(i);
          return;
        }
      }
    }
  }

  function onMove(e) {
    if (gameState !== 'playing' || gameOver) return;
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
    if (gameState !== 'playing' || gameOver) return;
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
    if (gameState === 'stageselect') {
      menuPulse2 += dt;
      Effects.update(dt);
      return;
    }

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
    if (gameState === 'stageselect') {
      renderStageSelect();
      return;
    }

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

  function renderStageSelect() {
    var cx = canvas.width / 2;

    var bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#E8EAF6');
    bgGrad.addColorStop(0.5, '#FCE4EC');
    bgGrad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (var b = 0; b < 4; b++) {
      var bbx = (canvas.width * 0.15) + Math.sin(menuPulse2 + b * 1.5) * canvas.width * 0.2;
      var bby = (canvas.height * 0.1) + Math.cos(menuPulse2 * 0.7 + b) * canvas.height * 0.3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(bbx, bby, 25, 0, Math.PI * 2);
      ctx.fill();
    }

    Effects.render(ctx);

    ctx.save();
    ctx.shadowColor = 'rgba(156, 39, 176, 0.2)';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7B1FA2';
    ctx.fillText('\u{1F9E9} Select Stage', cx, 50);
    ctx.restore();

    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9E9E9E';
    ctx.fillText('\u2B50 Best: ' + (highScore || 0), cx, 78);

    var cellSize = 16;
    var gap2 = 2;
    var cardW = 4 * (cellSize + gap2) + 16;
    var cardH = 4 * (cellSize + gap2) + 38;
    var cols2 = 2;
    var cardGap = 10;
    var totalW = cols2 * cardW + (cols2 - 1) * cardGap;
    var startX = cx - totalW / 2;
    var startY = 105;

    var stageColors = ['#FF6B81', '#42A5F5', '#66BB6A', '#FFA726', '#AB47BC', '#26C6DA', '#EF5350', '#78909C'];

    for (var i = 0; i < boardShapes.length; i++) {
      var row2 = Math.floor(i / cols2);
      var col2 = i % cols2;
      var bx = startX + col2 * (cardW + cardGap);
      var by = startY + row2 * (cardH + cardGap);
      var unlocked = isStageUnlocked(i);
      var stageCol = stageColors[i % stageColors.length];
      var isSelected = (i === currentStage);

      ctx.save();
      if (isSelected && unlocked) {
        ctx.shadowColor = stageCol;
        ctx.shadowBlur = 10;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;
      }
      ctx.fillStyle = unlocked ? '#FFFFFF' : '#F5F5F5';
      ctx.beginPath();
      ctx.roundRect(bx, by, cardW, cardH, 10);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = unlocked ? (isSelected ? stageCol : '#E0E0E0') : '#E0E0E0';
      ctx.lineWidth = isSelected && unlocked ? 2.5 : 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, cardW, cardH, 10);
      ctx.stroke();

      var mask = parseBoardShapeData(i);
      var mRows = mask.length;
      var mCols = mask[0].length;
      var mSize = cellSize;
      var ox = bx + (cardW - mCols * (mSize + gap2) + gap2) / 2;
      var oy = by + 6;

      for (var r = 0; r < mRows; r++) {
        for (var c = 0; c < mCols; c++) {
          var px = ox + c * (mSize + gap2);
          var py = oy + r * (mSize + gap2);
          if (mask[r][c]) {
            ctx.fillStyle = unlocked ? (isSelected ? stageCol : stageCol + '80') : '#E0E0E0';
            ctx.beginPath();
            ctx.roundRect(px, py, mSize, mSize, 2);
            ctx.fill();
          }
        }
      }

      ctx.font = 'bold 11px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = unlocked ? '#424242' : '#BDBDBD';
      ctx.fillText(boardShapes[i].name, bx + cardW / 2, by + cardH - 10);

      if (!unlocked) {
        ctx.font = '9px "Segoe UI", sans-serif';
        ctx.fillStyle = '#BDBDBD';
        ctx.fillText(boardShapes[i].unlock + ' pts', bx + cardW / 2, by + cardH - 0);

        ctx.save();
        ctx.strokeStyle = '#BDBDBD';
        ctx.fillStyle = 'rgba(189, 189, 189, 0.3)';
        ctx.lineWidth = 1.5;
        var lx = bx + cardW / 2;
        var ly = by + cardH / 2 - 4;
        ctx.beginPath();
        ctx.arc(lx, ly - 4, 5, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.roundRect(lx - 6, ly - 2, 12, 10, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }

    var backY = canvas.height - 40;
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.roundRect(cx - 60, backY - 16, 120, 32, 8);
    ctx.fill();
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2190 Back', cx, backY);
  }

  function parseBoardShapeData(idx) {
    return parseMask(boardShapes[idx].mask);
  }

  function drawHeader() {
    ctx.fillStyle = 'rgba(243, 229, 245, 0.92)';
    ctx.fillRect(0, 0, canvas.width, 55);

    ctx.strokeStyle = 'rgba(206, 147, 216, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.lineTo(canvas.width, 55);
    ctx.stroke();

    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5C6BC0';
    ctx.fillText('\u2B50 ' + score, 16, 22);

    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.fillStyle = '#AB47BC';
    ctx.fillText('\u2190 Back', 16, 42);

    ctx.textAlign = 'right';
    ctx.fillStyle = blockColors[currentStage % blockColors.length].main;
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.fillText(boardShapes[currentStage].name, canvas.width - 16, 22);

    if (comboCount > 1) {
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF6B81';
      ctx.fillText('\u2B50 COMBO x' + comboCount + '!', canvas.width / 2, 22);
    }
  }

  function drawBoard() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var x = GRID_X + c * (CELL + GAP);
        var y = GRID_Y + r * (CELL + GAP);

        if (!boardMask[r][c]) {
          continue;
        }

        if (board[r][c] >= 0) {
          drawCell(x, y, CELL, board[r][c], (animClearing && isClearing(r, c)) ? 0.5 : 1);
        } else {
          ctx.fillStyle = 'rgba(206, 147, 216, 0.12)';
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

    var nextY = PREVIEW_Y - 5;
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.fillText('Next pieces', canvas.width / 2, nextY);

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
        var bc2 = blockColors[blocks[i].color];
        var g = ctx.createLinearGradient(sx, sy, sx + previewCell, sy + previewCell);
        g.addColorStop(0, bc2.light);
        g.addColorStop(0.5, bc2.main);
        g.addColorStop(1, bc2.dark);
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

    ctx.globalAlpha = 0.4;
    for (var i = 0; i < block.shape.length; i++) {
      var r = br + block.shape[i][0];
      var c = bc + block.shape[i][1];
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (!boardMask[r][c]) continue;
      var x = GRID_X + c * (CELL + GAP);
      var y = GRID_Y + r * (CELL + GAP);
      if (canP) {
        drawCell(x, y, CELL, block.color, 0.4);
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
    ctx.fillStyle = 'rgba(243, 229, 245, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.1)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cx - 130, cy - 140, 260, 310, 20);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#CE93D8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 130, cy - 140, 260, 310, 20);
    ctx.stroke();

    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E91E63';
    ctx.fillText('\u{1F614} Game Over!', cx, cy - 100);

    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#424242';
    ctx.fillText('\u2B50 ' + score, cx, cy - 55);

    if (highScore !== undefined && highScore !== null) {
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = score >= highScore ? '#FF9800' : '#9E9E9E';
      ctx.fillText(score >= highScore ? '\u{1F3C6} New Record!' : 'Best: ' + highScore, cx, cy - 22);
    }

    var btnW = 200, btnH = 46, btnY = cy - 5;

    ctx.save();
    ctx.shadowColor = 'rgba(33, 150, 243, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#42A5F5';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u25B6 Retry', cx, btnY + btnH / 2);

    var btn2Y = btnY + btnH + 10;
    ctx.save();
    ctx.shadowColor = 'rgba(156, 39, 176, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#AB47BC';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F9E9} Stages', cx, btn2Y + btnH / 2);

    var btn3Y = btn2Y + btnH + 10;
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btn3Y, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F3E0} Menu', cx, btn3Y + btnH / 2);
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