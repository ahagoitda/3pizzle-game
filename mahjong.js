const Mahjong = (function () {
  'use strict';

  var TILE_W = 46, TILE_H = 54, GAP = 2, LAYER_OFF_X = 3, LAYER_OFF_Y = 3;
  var canvas, ctx, onBack;
  var tiles, selectedIdx, score, pairsLeft, hintPair;
  var gameState, animRemoving, removeTimer, removePair_;
  var boardX, boardY, maxR, maxC;
  var tileTypes, shapeNames, shapeColors;
  var congratsTime;
  var connectionPath;
  var connectionTimer;
  var noMovesNotified;
  var noMovesNotifiedTime;
  var highScore;
  var scorePopups;
  var difficulty;
  var undoStack = [];
  var mouseX = -1000;
  var mouseY = -1000;
  var symbolImages = [];
  var symbolLoadedCount = 0;
  var symbolsLoaded = false;

  var SHAPE_DRAW = ['circle', 'diamond', 'square', 'triangle', 'star', 'heart'];
  var TYPE_COLORS = ['#FF4757', '#3B82F6', '#10B981', '#F59E0B', '#A855F7', '#F97316', '#EC4899', '#6366F1', '#14B8A6'];

  function init(cnv, ctxt, backCb, diff) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    difficulty = diff || 'normal';
    TILE_W = 44; TILE_H = 52;
    shapeNames = SHAPE_DRAW;
    shapeColors = TYPE_COLORS;

    preloadImages();

    resetGame();
    bindInput();
  }

  function preloadImages() {
    if (symbolsLoaded) return;
    symbolImages = [];
    symbolLoadedCount = 0;
    var paths = [
      'assets/mahjong_dragon.png',
      'assets/mahjong_phoenix.png',
      'assets/mahjong_lotus.png',
      'assets/mahjong_bamboo.png',
      'assets/mahjong_panda.png',
      'assets/mahjong_yin_yang.png'
    ];
    for (var i = 0; i < 6; i++) {
      var img = new Image();
      img.src = paths[i];
      img.onload = function() {
        symbolLoadedCount++;
        if (symbolLoadedCount === 6) {
          symbolsLoaded = true;
        }
      };
      img.onerror = function() {
        symbolLoadedCount++;
        if (symbolLoadedCount === 6) {
          symbolsLoaded = true;
        }
      };
      symbolImages.push(img);
    }
  }

  function resetGame() {
    generateTiles();
    selectedIdx = -1;
    score = 0;
    pairsLeft = 36;
    gameState = 'playing';
    animRemoving = false;
    removeTimer = 0;
    removePair_ = null;
    hintPair = null;
    congratsTime = 0;
    connectionPath = null;
    connectionTimer = 0;
    noMovesNotified = false;
    scorePopups = [];
    undoStack = [];
    Effects.reset();
  }

  function generateTiles() {
    tiles = [];
    var typeCount = 36;
    var typePool = [];
    for (var i = 0; i < typeCount; i++) { typePool.push(i); typePool.push(i); }
    for (var j = typePool.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = typePool[j]; typePool[j] = typePool[k]; typePool[k] = tmp;
    }

    maxR = 5; maxC = 8;
    var layouts = [
      { r: 0, c: 0, rows: 5, cols: 8 },   // layer 0
      { r: 0, c: 1, rows: 4, cols: 6 },   // layer 1
      { r: 1, c: 2, rows: 2, cols: 4 }    // layer 2
    ];

    var idx = 0;
    for (var lay = 0; lay < layouts.length; lay++) {
      var lo = layouts[lay];
      for (var rr = lo.r; rr < lo.r + lo.rows; rr++) {
        for (var cc = lo.c; cc < lo.c + lo.cols; cc++) {
          tiles.push({
            r: rr, c: cc, layer: lay,
            typeIdx: typePool[idx],
            removed: false
          });
          idx++;
        }
      }
    }

    boardX = Math.floor((canvas.width - (maxC * (TILE_W + GAP) - GAP)) / 2);
    boardY = 96;
  }

  function getTilePos(tile) {
    return {
      x: boardX + tile.c * (TILE_W + GAP) - tile.layer * LAYER_OFF_X,
      y: boardY + tile.r * (TILE_H + GAP) - tile.layer * LAYER_OFF_Y
    };
  }

  function isTileFree(tile) {
    if (tile.removed) return false;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t.removed) continue;
      if (t.layer > tile.layer) {
        if (t.r === tile.r && t.c === tile.c) return false;
      }
    }
    var leftBlocked = false, rightBlocked = false;
    for (var j = 0; j < tiles.length; j++) {
      var n = tiles[j];
      if (n.removed || n === tile || n.layer !== tile.layer) continue;
      if (n.r === tile.r) {
        if (n.c === tile.c - 1) leftBlocked = true;
        if (n.c === tile.c + 1) rightBlocked = true;
      }
    }
    return !(leftBlocked && rightBlocked);
  }

  function findTileByPos(x, y) {
    var best = null, bestLayer = -1;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      if (t.removed) continue;
      var p = getTilePos(t);
      if (x >= p.x && x <= p.x + TILE_W && y >= p.y && y <= p.y + TILE_H) {
        if (t.layer > bestLayer) { best = i; bestLayer = t.layer; }
      }
    }
    return best;
  }

  function canConnect(idxA, idxB) {
    var path = findConnectionPath(idxA, idxB);
    return path !== null;
  }

  function findConnectionPath(idxA, idxB) {
    if (idxA === idxB) return null;
    var a = tiles[idxA], b = tiles[idxB];
    if (a.typeIdx !== b.typeIdx) return null;

    var ar = a.r, ac = a.c, al = a.layer;
    var br = b.r, bc = b.c, bl = b.layer;

    function isEmpty(r, c, layer) {
      if (r < 0 || r >= maxR || c < 0 || c >= maxC) return true;
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i];
        if (t.removed || i === idxA || i === idxB) continue;
        if (t.layer === layer && t.r === r && t.c === c) return false;
      }
      return true;
    }

    function clearRow(r, c1, c2, layer) {
      if (c1 > c2) { var tmp = c1; c1 = c2; c2 = tmp; }
      for (var c = c1 + 1; c < c2; c++) {
        if (!isEmpty(r, c, layer)) return false;
      }
      return true;
    }

    function clearCol(c, r1, r2, layer) {
      if (r1 > r2) { var tmp = r1; r1 = r2; r2 = tmp; }
      for (var r = r1 + 1; r < r2; r++) {
        if (!isEmpty(r, c, layer)) return false;
      }
      return true;
    }

    function tilePixelCenter(idx) {
      var t = tiles[idx];
      var p = getTilePos(t);
      return { x: p.x + TILE_W / 2, y: p.y + TILE_H / 2 };
    }

    if (al !== bl) {
      var result = findCrossLayerPath(idxA, idxB);
      return result;
    }

    if (ar === br && clearRow(ar, ac, bc, al)) {
      return [tilePixelCenter(idxA), tilePixelCenter(idxB)];
    }
    if (ac === bc && clearCol(ac, ar, br, al)) {
      return [tilePixelCenter(idxA), tilePixelCenter(idxB)];
    }

    if (isEmpty(ar, bc, al) && clearRow(ar, ac, bc, al) && clearCol(bc, ar, br, al)) {
      var mid1 = { x: boardX + bc * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + ar * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
      return [tilePixelCenter(idxA), mid1, tilePixelCenter(idxB)];
    }
    if (isEmpty(br, ac, al) && clearCol(ac, ar, br, al) && clearRow(br, ac, bc, al)) {
      var mid2 = { x: boardX + ac * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + br * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
      return [tilePixelCenter(idxA), mid2, tilePixelCenter(idxB)];
    }

    for (var r = 0; r < maxR; r++) {
      if (r === ar || r === br) continue;
      if (isEmpty(r, ac, al) && isEmpty(r, bc, al) && clearCol(ac, ar, r, al) && clearCol(bc, br, r, al) && clearRow(r, ac, bc, al)) {
        var m1 = { x: boardX + ac * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + r * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
        var m2 = { x: boardX + bc * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + r * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
        return [tilePixelCenter(idxA), m1, m2, tilePixelCenter(idxB)];
      }
    }
    for (var c = 0; c < maxC; c++) {
      if (c === ac || c === bc) continue;
      if (isEmpty(ar, c, al) && isEmpty(br, c, al) && clearRow(ar, ac, c, al) && clearRow(br, bc, c, al) && clearCol(c, ar, br, al)) {
        var m3 = { x: boardX + c * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + ar * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
        var m4 = { x: boardX + c * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X, y: boardY + br * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y };
        return [tilePixelCenter(idxA), m3, m4, tilePixelCenter(idxB)];
      }
    }

    for (var row2 = -1; row2 <= maxR; row2++) {
      if (clearCol(ac, ar === row2 ? ar : ar, row2, al) || row2 === ar) {
        if ((row2 < 0 || row2 >= maxR || isEmpty(row2, ac, al)) && (row2 < 0 || row2 >= maxR || isEmpty(row2, bc, al))) {
          if (row2 < 0 || row2 >= maxR || clearRow(row2, ac, bc, al)) {
            var my = row2 < 0 ? boardY - 10 : row2 >= maxR ? boardY + maxR * (TILE_H + GAP) + 10 : boardY + row2 * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y;
            var mx1 = boardX + ac * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X;
            var mx2 = boardX + bc * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X;
            if (row2 !== ar && row2 !== br) return [tilePixelCenter(idxA), { x: mx1, y: my }, { x: mx2, y: my }, tilePixelCenter(idxB)];
          }
        }
      }
    }
    for (var col2 = -1; col2 <= maxC; col2++) {
      if (col2 < 0 || col2 >= maxC || (isEmpty(ar, col2, al) && isEmpty(br, col2, al))) {
        if ((col2 < 0 || col2 >= maxC || clearRow(ar, ac, col2, al)) && (col2 < 0 || col2 >= maxC || clearRow(br, bc, col2, al))) {
          if (col2 < 0 || col2 >= maxC || clearCol(col2, ar, br, al)) {
            var mx = col2 < 0 ? boardX - 10 : col2 >= maxC ? boardX + maxC * (TILE_W + GAP) + 10 : boardX + col2 * (TILE_W + GAP) + TILE_W / 2 - al * LAYER_OFF_X;
            var my1 = boardY + ar * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y;
            var my2 = boardY + br * (TILE_H + GAP) + TILE_H / 2 - al * LAYER_OFF_Y;
            if (col2 !== ac && col2 !== bc) return [tilePixelCenter(idxA), { x: mx, y: my1 }, { x: mx, y: my2 }, tilePixelCenter(idxB)];
          }
        }
      }
    }

    return null;
  }

  function findCrossLayerPath(idxA, idxB) {
    var a = tiles[idxA], b = tiles[idxB];
    if (!isTileFree(a) || !isTileFree(b)) return null;

    function tilePixelCenter(idx) {
      var t = tiles[idx];
      var p = getTilePos(t);
      return { x: p.x + TILE_W / 2, y: p.y + TILE_H / 2 };
    }

    var freeA = getFreeEdgePoint(a);
    var freeB = getFreeEdgePoint(b);

    if (freeA && freeB) {
      var midX = (freeA.x + freeB.x) / 2;
      var midY = (freeA.y + freeB.y) / 2;
      return [tilePixelCenter(idxA), freeA, { x: midX, y: freeA.y }, { x: midX, y: freeB.y }, freeB, tilePixelCenter(idxB)];
    }

    return null;
  }

  function getFreeEdgePoint(tile) {
    var p = getTilePos(tile);
    var leftFree = true, rightFree = true;
    for (var j = 0; j < tiles.length; j++) {
      var n = tiles[j];
      if (n.removed || n === tile || n.layer !== tile.layer) continue;
      if (n.r === tile.r) {
        if (n.c === tile.c - 1) leftFree = false;
        if (n.c === tile.c + 1) rightFree = false;
      }
    }
    if (leftFree) return { x: p.x - 10, y: p.y + TILE_H / 2 };
    if (rightFree) return { x: p.x + TILE_W + 10, y: p.y + TILE_H / 2 };
    return null;
  }

  function removePair(idxA, idxB) {
    var a = tiles[idxA], b = tiles[idxB];

    var path = findConnectionPath(idxA, idxB);
    if (path && path.length >= 2) {
      connectionPath = path;
      connectionTimer = 0.5;
    }

    a.removed = true;
    b.removed = true;
    pairsLeft--;
    undoStack.push({ idxA: idxA, idxB: idxB });

    var pa = getTilePos(a), pb = getTilePos(b);
    Effects.emit(pa.x + TILE_W / 2, pa.y + TILE_H / 2, 10, '#FFD700', {
      speedMin: 50, speedMax: 150, sizeMin: 2, sizeMax: 5
    });
    Effects.emit(pb.x + TILE_W / 2, pb.y + TILE_H / 2, 10, '#FFD700', {
      speedMin: 50, speedMax: 150, sizeMin: 2, sizeMax: 5
    });

    score += 10;
    noMovesNotified = false;

    scorePopups.push({
      x: (pa.x + pb.x) / 2 + TILE_W / 2,
      y: (pa.y + pb.y) / 2 + TILE_H / 2,
      text: '+10',
      life: 0.8,
      maxLife: 0.8,
      color: '#FFD700'
    });

    Sound.mahjongMatch();

    if (pairsLeft === 0) {
      gameState = 'won';
      congratsTime = 0;
      Sound.win();
      Effects.emit(canvas.width / 2, canvas.height / 2, 60, '#FFD700', { speedMin: 80, speedMax: 300, lifeMin: 0.5, lifeMax: 2 });
      Effects.shake(6);
    } else {
      checkStalemate();
    }
  }

  function undo() {
    if (undoStack.length === 0) {
      Sound.invalid();
      return;
    }
    var last = undoStack.pop();
    tiles[last.idxA].removed = false;
    tiles[last.idxB].removed = false;
    pairsLeft++;
    score = Math.max(0, score - 20);
    selectedIdx = -1;
    hintPair = null;
    Sound.undo();

    var pa = getTilePos(tiles[last.idxA]), pb = getTilePos(tiles[last.idxB]);
    Effects.emit(pa.x + TILE_W / 2, pa.y + TILE_H / 2, 6, 'rgba(103, 58, 183, 0.6)', { speedMin: 30, speedMax: 80 });
    Effects.emit(pb.x + TILE_W / 2, pb.y + TILE_H / 2, 6, 'rgba(103, 58, 183, 0.6)', { speedMin: 30, speedMax: 80 });

    scorePopups.push({
      x: (pa.x + pb.x) / 2 + TILE_W / 2,
      y: (pa.y + pb.y) / 2 + TILE_H / 2,
      text: '-20',
      life: 0.8,
      maxLife: 0.8,
      color: '#FF3D00'
    });
  }

  function checkStalemate() {
    var pair = findAnyPair();
    if (!pair && pairsLeft > 0) {
      shuffleTiles();
    }
  }

  function shuffleTiles() {
    var remaining = [];
    for (var i = 0; i < tiles.length; i++) {
      if (!tiles[i].removed) remaining.push(tiles[i]);
    }
    var types = [];
    for (var j = 0; j < remaining.length; j++) {
      types.push(remaining[j].typeIdx);
    }
    for (var k = types.length - 1; k > 0; k--) {
      var m = Math.floor(Math.random() * (k + 1));
      var tmp = types[k]; types[k] = types[m]; types[m] = tmp;
    }
    for (var n = 0; n < remaining.length; n++) {
      remaining[n].typeIdx = types[n];
    }
    selectedIdx = -1;
    hintPair = null;
    noMovesNotified = true;
    noMovesNotifiedTime = Date.now();
    Effects.emit(canvas.width / 2, canvas.height / 2, 30, '#A855F7', { speedMin: 60, speedMax: 180, sizeMin: 3, sizeMax: 7 });
    Effects.shake(4);

    var retryCount = 0;
    while (!findAnyPair() && retryCount < 50) {
      for (var k2 = types.length - 1; k2 > 0; k2--) {
        var m2 = Math.floor(Math.random() * (k2 + 1));
        var tmp2 = types[k2]; types[k2] = types[m2]; types[m2] = tmp2;
      }
      for (var n2 = 0; n2 < remaining.length; n2++) {
        remaining[n2].typeIdx = types[n2];
      }
      retryCount++;
    }
  }

  function findAnyPair() {
    var free = [];
    for (var i = 0; i < tiles.length; i++) {
      if (!tiles[i].removed && isTileFree(tiles[i])) free.push(i);
    }
    for (var a = 0; a < free.length; a++) {
      for (var b = a + 1; b < free.length; b++) {
        if (canConnect(free[a], free[b])) return [free[a], free[b]];
      }
    }
    return null;
  }

  function handlePointer(e) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function onDown(e) {
    var p = handlePointer(e.touches ? e.touches[0] : e);
    if (gameState === 'won') {
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var btnW = 200, btnH = 44, btnY = cy + 46;
      var btn2Y = btnY + btnH + 12;
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
    if (p.y < 76) {
      if (p.x < 80) { onBack(); return; }
      
      var cw = canvas.width;
      // Hint
      if (p.x >= cw - 210 && p.x <= cw - 150 && p.y >= 26 && p.y <= 66) {
        showHint();
        Sound.click();
        return;
      }
      // Undo
      if (p.x >= cw - 140 && p.x <= cw - 90 && p.y >= 26 && p.y <= 66) {
        undo();
        return;
      }
      // Reset
      if (p.x >= cw - 80 && p.x <= cw - 10 && p.y >= 26 && p.y <= 66) {
        resetGame();
        Sound.click();
        return;
      }
      return;
    }
    if (animRemoving) return;

    var idx = findTileByPos(p.x, p.y);
    if (idx < 0) { selectedIdx = -1; hintPair = null; return; }
    if (!isTileFree(tiles[idx])) return;

    if (selectedIdx < 0) {
      selectedIdx = idx;
      hintPair = null;
    } else if (selectedIdx === idx) {
      selectedIdx = -1;
    } else if (canConnect(selectedIdx, idx)) {
      var a = selectedIdx, b = idx;
      selectedIdx = -1;
      hintPair = null;
      removePair(a, b);
    } else {
      selectedIdx = idx;
      hintPair = null;
    }
  }

  function showHint() {
    var pair = findAnyPair();
    if (pair) {
      hintPair = pair;
      var penalty = difficulty === 'easy' ? 0 : difficulty === 'hard' ? 10 : 5;
      score = Math.max(0, score - penalty);
    }
  }

  function onMouseMove(e) {
    var p = handlePointer(e);
    mouseX = p.x;
    mouseY = p.y;
  }

  function onMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      var p = handlePointer(e.touches[0]);
      mouseX = p.x;
      mouseY = p.y;
    }
  }

  function bindInput() {
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  }

  function unbindInput() {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('touchstart', onDown);
    canvas.removeEventListener('touchmove', onTouchMove);
  }

  function update(dt) {
    if (gameState === 'won') {
      congratsTime += dt;
    }
    if (connectionTimer > 0) {
      connectionTimer -= dt;
      if (connectionTimer <= 0) {
        connectionPath = null;
        connectionTimer = 0;
      }
    }
    for (var i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].life -= dt;
      scorePopups[i].y -= 25 * dt;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }
    Effects.update(dt);
  }

  function render() {
    var shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawHeader();
    drawAllTiles();
    drawSelectionHighlight();
    drawConnectionPath();
    Effects.render(ctx);
    drawScorePopups();

    if (gameState === 'won') drawWinScreen();
    if (noMovesNotified && gameState === 'playing') {
      var elapsed = (Date.now() - (noMovesNotifiedTime || Date.now())) / 1000;
      if (elapsed < 2) {
        var shuffleAlpha = 1 - elapsed / 2;
        ctx.save();
        ctx.globalAlpha = shuffleAlpha;
        ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#AB47BC';
        ctx.shadowColor = '#AB47BC';
        ctx.shadowBlur = 8;
        ctx.fillText('\u{1F500} Shuffled!', canvas.width / 2, canvas.height - 30);
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawHeader() {
    ctx.fillStyle = 'rgba(15, 12, 26, 0.85)';
    ctx.fillRect(0, 0, canvas.width, 76);

    ctx.strokeStyle = 'rgba(103, 58, 183, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 76);
    ctx.lineTo(canvas.width, 76);
    ctx.stroke();

    var isBackHovered = (mouseX >= 10 && mouseX <= 75 && mouseY >= 10 && mouseY <= 50);
    ctx.font = 'bold 15px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isBackHovered ? '#FFFFFF' : '#90A4AE';
    ctx.fillText('\u2190 Back', 16, 28);

    ctx.font = 'bold 20px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#AB47BC';
    ctx.fillText('\u2B50 ' + score, 16, 54);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 15px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText('Pairs: ' + pairsLeft, canvas.width - 16, 20);

    var cw = canvas.width;
    var isHintH = (mouseX >= cw - 210 && mouseX <= cw - 150 && mouseY >= 34 && mouseY <= 64);
    var isUndoH = (mouseX >= cw - 140 && mouseX <= cw - 90 && mouseY >= 34 && mouseY <= 64);
    var isResetH = (mouseX >= cw - 80 && mouseX <= cw - 10 && mouseY >= 34 && mouseY <= 64);

    ctx.font = '12px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    
    ctx.fillStyle = isHintH ? '#FFFFFF' : '#FF9800';
    ctx.fillText('Hint\u2728', cw - 180, 48);

    ctx.fillStyle = isUndoH ? '#FFFFFF' : (undoStack.length > 0 ? '#E91E63' : '#607D8B');
    ctx.fillText('Undo\u21A9', cw - 115, 48);

    ctx.fillStyle = isResetH ? '#FFFFFF' : '#00E676';
    ctx.fillText('Reset\u21BA', cw - 45, 48);

    var barX = 110;
    var barY = 52;
    var barW = cw - 340;
    if (barW > 60) {
      var progress = Math.max(0, pairsLeft / 36);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, 6, 3);
      ctx.fill();

      var barGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      barGrad.addColorStop(0, '#AB47BC');
      barGrad.addColorStop(1, '#60A5FA');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progress, 6, 3);
      ctx.fill();
    }
  }

  function drawAllTiles() {
    var sorted = tiles.slice().sort(function (a, b) { return a.layer - b.layer; });
    for (var i = 0; i < sorted.length; i++) {
      if (sorted[i].removed) continue;
      drawTile(sorted[i], false);
    }
  }

  function drawTile(tile, highlighted) {
    var p = getTilePos(tile);
    var x = p.x, y = p.y;

    var isSelected = (selectedIdx >= 0 && tiles[selectedIdx] === tile);
    var isHinted = false;
    if (hintPair) {
      isHinted = (tiles[hintPair[0]] === tile || tiles[hintPair[1]] === tile);
    }
    
    var dy = (isSelected || isHinted) ? -5 : 0;
    
    ctx.save();
    ctx.translate(0, dy);

    if (isSelected) {
      ctx.shadowColor = 'rgba(233, 30, 99, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
    } else if (isHinted) {
      ctx.shadowColor = 'rgba(0, 230, 118, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 5;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 3;
    }

    var bgGrad = ctx.createLinearGradient(x, y, x, y + TILE_H);
    bgGrad.addColorStop(0, '#FFFEF5');
    bgGrad.addColorStop(0.25, '#F9F4E5');
    bgGrad.addColorStop(0.85, '#EAE1C8');
    bgGrad.addColorStop(1, '#D8CFB3');
    
    ctx.fillStyle = '#B4A680';
    ctx.beginPath();
    ctx.roundRect(x, y + 2, TILE_W, TILE_H, 6);
    ctx.fill();

    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, TILE_W, TILE_H, 5);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, 4.5);
    ctx.stroke();

    ctx.strokeStyle = '#C2B591';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, TILE_W, TILE_H, 5);
    ctx.stroke();

    var innerX = x + 4, innerY = y + 4, innerW = TILE_W - 8, innerH = TILE_H - 8;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, 3);
    ctx.fill();

    drawTileSymbol(innerX, innerY, innerW, innerH, tile.typeIdx);
    ctx.restore();
  }

  function drawTileSymbol(x, y, w, h, typeIdx) {
    var shapeIdx = typeIdx % 6;
    var colorIdx = Math.floor(typeIdx / 6) % shapeColors.length;
    var color = shapeColors[colorIdx];
    var cx = x + w / 2, cy = y + h / 2;
    var sz = Math.min(w, h) * 0.35;

    if (symbolsLoaded && symbolImages[shapeIdx] && symbolImages[shapeIdx].complete && symbolImages[shapeIdx].naturalWidth !== 0) {
      ctx.save();
      // Draw subtle circular backplate
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, sz * 1.1, 0, Math.PI * 2);
      ctx.fill();

      // Draw a colored ring outline
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Draw the symbol in the center
      var imgSize = sz * 1.5;
      ctx.drawImage(symbolImages[shapeIdx], cx - imgSize / 2, cy - imgSize / 2, imgSize, imgSize);
      return;
    }

    var shapeName = shapeNames[typeIdx % shapeNames.length];
    var color = shapeColors[Math.floor(typeIdx / shapeNames.length) % shapeColors.length];
    var cx = x + w / 2, cy = y + h / 2;
    var sz = Math.min(w, h) * 0.3;

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (shapeName) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(cx, cy, sz, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(cx, cy - sz);
        ctx.lineTo(cx + sz * 0.65, cy);
        ctx.lineTo(cx, cy + sz);
        ctx.lineTo(cx - sz * 0.65, cy);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(cx - sz * 0.6, cy - sz * 0.6, sz * 1.2, sz * 1.2);
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(cx, cy - sz);
        ctx.lineTo(cx + sz * 0.75, cy + sz * 0.6);
        ctx.lineTo(cx - sz * 0.75, cy + sz * 0.6);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star':
        drawStar(cx, cy, sz * 0.35, sz, 5);
        ctx.fill();
        break;
      case 'heart':
        drawHeart(cx, cy, sz);
        ctx.fill();
        break;
    }
  }

  function drawStar(cx, cy, innerR, outerR, points) {
    ctx.beginPath();
    for (var i = 0; i < points * 2; i++) {
      var r = i % 2 === 0 ? outerR : innerR;
      var angle = (i * Math.PI) / points - Math.PI / 2;
      var sx = cx + Math.cos(angle) * r;
      var sy = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }

  function drawHeart(cx, cy, sz) {
    ctx.beginPath();
    var topY = cy - sz * 0.5;
    ctx.moveTo(cx, cy + sz * 0.8);
    ctx.bezierCurveTo(cx - sz * 1.2, cy + sz * 0.3, cx - sz, topY, cx - sz * 0.4, topY - sz * 0.1);
    ctx.bezierCurveTo(cx, topY + sz * 0.2, cx, topY + sz * 0.1, cx, cy);
    ctx.bezierCurveTo(cx, topY + sz * 0.1, cx, topY + sz * 0.2, cx + sz * 0.4, topY - sz * 0.1);
    ctx.bezierCurveTo(cx + sz, topY, cx + sz * 1.2, cy + sz * 0.3, cx, cy + sz * 0.8);
    ctx.closePath();
  }

  function drawSelectionHighlight() {
    return;
  }

  function drawConnectionPath() {
    if (!connectionPath || connectionPath.length < 2) return;
    var alpha = Math.min(1, connectionTimer * 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    
    ctx.setLineDash([8, 5]);
    ctx.lineDashOffset = -Math.floor(Date.now() / 25) % 100;
    
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(connectionPath[0].x, connectionPath[0].y);
    for (var i = 1; i < connectionPath.length; i++) {
      ctx.lineTo(connectionPath[i].x, connectionPath[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    for (var j = 0; j < connectionPath.length; j++) {
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(connectionPath[j].x, connectionPath[j].y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var alpha = Math.min(1, congratsTime);
    ctx.save();
    ctx.globalAlpha = alpha;

    var animatedScore = Math.min(score, Math.floor(score * (congratsTime / 1.5)));

    ctx.shadowColor = 'rgba(171, 71, 188, 0.25)';
    ctx.shadowBlur = 30;
    drawRoundRect(cx - 140, cy - 140, 280, 280, 24, 'rgba(25, 18, 48, 0.85)', 'rgba(255, 255, 255, 0.08)', 1.5);
    ctx.restore();

    ctx.font = 'bold 30px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#AB47BC';
    ctx.fillText('\u{1F3C6} Clear!', cx, cy - 84);

    ctx.font = 'bold 36px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2B50 ' + animatedScore, cx, cy - 30);

    if (highScore !== undefined && highScore !== null) {
      ctx.font = '15px "Outfit", "Segoe UI", sans-serif';
      if (score >= highScore && score > 0) {
        var hue = (Date.now() / 10) % 360;
        ctx.fillStyle = 'hsl(' + hue + ', 100%, 65%)';
        ctx.fillText('\u{1F3C6} New Record!', cx, cy + 15);
      } else {
        ctx.fillStyle = '#90A4AE';
        ctx.fillText('Best: ' + highScore, cx, cy + 15);
      }
    }

    var btnW = 200, btnH = 44, btnY = cy + 46;
    var btn2Y = btnY + btnH + 12;

    var isRetryHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btnY && mouseY <= btnY + btnH);
    ctx.save();
    if (isRetryHovered) {
      ctx.shadowColor = 'rgba(171, 71, 188, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 2;
    }
    var retryBg = isRetryHovered ? '#BE5EDC' : '#AB47BC';
    var retryBorder = isRetryHovered ? '#FFFFFF' : '#8E24AA';
    drawRoundRect(cx - btnW / 2, btnY, btnW, btnH, 12, retryBg, retryBorder, 1.5);
    ctx.restore();
    ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u25B6 Retry', cx, btnY + btnH / 2);

    var isMenuHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btn2Y && mouseY <= btn2Y + btnH);
    ctx.save();
    if (isMenuHovered) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.1)';
      ctx.shadowBlur = 12;
    }
    var menuBg = isMenuHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
    var menuBorder = isMenuHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
    drawRoundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12, menuBg, menuBorder, 1.5);
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F3E0} Menu', cx, btn2Y + btnH / 2);

    ctx.globalAlpha = 1;
  }

  function drawScorePopups() {
    for (var i = 0; i < scorePopups.length; i++) {
      var sp = scorePopups[i];
      var alpha2 = Math.max(0, sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha2;
      ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = sp.color;
      ctx.fillText(sp.text, sp.x, sp.y);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  function destroy() {
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
