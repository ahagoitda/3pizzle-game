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

  var SHAPE_DRAW = ['circle', 'diamond', 'square', 'triangle', 'star', 'heart'];
  var TYPE_COLORS = ['#FF4757', '#3B82F6', '#10B981', '#F59E0B', '#A855F7', '#F97316', '#EC4899', '#6366F1', '#14B8A6'];

  function init(cnv, ctxt, backCb) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    TILE_W = 44; TILE_H = 52;
    shapeNames = SHAPE_DRAW;
    shapeColors = TYPE_COLORS;

    resetGame();
    bindInput();
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
    boardY = 80;
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
      var btnW = 200, btnH = 50, btnY = cy + 30;
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
    if (p.y < 60 && p.x < 60) { onBack(); return; }
    if (animRemoving) return;

    if (p.y < 60) {
      if (p.x > canvas.width - 80) { resetGame(); return; }
      if (p.x > canvas.width - 160) { showHint(); return; }
      return;
    }

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
      score = Math.max(0, score - 5);
    }
  }

  function bindInput() {
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('touchstart', onDown, { passive: false });
  }

  function unbindInput() {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('touchstart', onDown);
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
        ctx.font = 'bold 16px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#A855F7';
        ctx.fillText('Shuffled!', canvas.width / 2, canvas.height - 30);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawHeader() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, 60);

    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillText('Pairs: ' + pairsLeft, canvas.width - 20, 30);

    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Back', 18, 52);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Hint (-5)   Reset', canvas.width - 18, 52);
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

    if (highlighted) {
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
    }

    var bgGrad = ctx.createLinearGradient(x, y, x + TILE_W, y + TILE_H);
    bgGrad.addColorStop(0, '#FFFEF5');
    bgGrad.addColorStop(0.15, '#F5F0E0');
    bgGrad.addColorStop(0.85, '#E8E0C8');
    bgGrad.addColorStop(1, '#D5CCB0');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, TILE_W, TILE_H, 5);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.strokeStyle = '#C4B896';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, TILE_W - 2, TILE_H - 2, 4);
    ctx.stroke();

    var innerX = x + 4, innerY = y + 4, innerW = TILE_W - 8, innerH = TILE_H - 8;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.roundRect(innerX, innerY, innerW, innerH, 3);
    ctx.fill();

    drawTileSymbol(innerX, innerY, innerW, innerH, tile.typeIdx);
  }

  function drawTileSymbol(x, y, w, h, typeIdx) {
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
    if (hintPair) {
      for (var i = 0; i < hintPair.length; i++) {
        var t = tiles[hintPair[i]];
        var p = getTilePos(t);
        ctx.strokeStyle = '#00FF88';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.roundRect(p.x - 2, p.y - 2, TILE_W + 4, TILE_H + 4, 6);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (selectedIdx >= 0 && !tiles[selectedIdx].removed) {
      var st = tiles[selectedIdx];
      var sp = getTilePos(st);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(sp.x - 2, sp.y - 2, TILE_W + 4, TILE_H + 4, 6);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawConnectionPath() {
    if (!connectionPath || connectionPath.length < 2) return;
    var alpha = Math.min(1, connectionTimer * 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(connectionPath[0].x, connectionPath[0].y);
    for (var i = 1; i < connectionPath.length; i++) {
      ctx.lineTo(connectionPath[i].x, connectionPath[i].y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (var j = 0; j < connectionPath.length; j++) {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(connectionPath[j].x, connectionPath[j].y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var alpha = Math.min(1, congratsTime);
    ctx.globalAlpha = alpha;

    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Clear!', cx, cy - 80);
    ctx.shadowBlur = 0;

    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, cx, cy - 30);

    if (highScore !== undefined && highScore !== null) {
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillStyle = score >= highScore ? '#FFD700' : '#aaa';
      ctx.fillText(score >= highScore ? 'New High Score!' : 'Best: ' + highScore, cx, cy + 5);
    }

    var btnW = 200, btnH = 50, btnY = cy + 30;
    ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
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

    ctx.globalAlpha = 1;
  }

  function drawScorePopups() {
    for (var i = 0; i < scorePopups.length; i++) {
      var sp = scorePopups[i];
      var alpha2 = Math.max(0, sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha2;
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
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
