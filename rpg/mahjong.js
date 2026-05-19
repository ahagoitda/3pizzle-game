const Mahjong = (function () {
  'use strict';

  var TILE_W = 46, TILE_H = 54, GAP = 2, LAYER_OFF_X = 3, LAYER_OFF_Y = 3;
  var canvas, ctx, onBack;
  var tiles, selectedIdx, score, pairsLeft, hintPair;
  var gameState, animRemoving, removeTimer, removePair_;
  var boardX, boardY, maxR, maxC;
  var tileTypes, shapeNames, shapeColors;
  var congratsTime;

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
    if (idxA === idxB) return false;
    var a = tiles[idxA], b = tiles[idxB];
    if (a.typeIdx !== b.typeIdx) return false;

    var ar = a.r, ac = a.c, al = a.layer;
    var br = b.r, bc = b.c, bl = b.layer;
    if (al !== bl) return false;

    function isEmpty(r, c) {
      if (r < 0 || r >= maxR || c < 0 || c >= maxC) return true;
      for (var i = 0; i < tiles.length; i++) {
        var t = tiles[i];
        if (t.removed || i === idxA || i === idxB) continue;
        if (t.layer === al && t.r === r && t.c === c) return false;
      }
      return true;
    }

    function clearRow(r, c1, c2) {
      if (c1 > c2) { var tmp = c1; c1 = c2; c2 = tmp; }
      for (var c = c1 + 1; c < c2; c++) {
        if (!isEmpty(r, c)) return false;
      }
      return true;
    }

    function clearCol(c, r1, r2) {
      if (r1 > r2) { var tmp = r1; r1 = r2; r2 = tmp; }
      for (var r = r1 + 1; r < r2; r++) {
        if (!isEmpty(r, c)) return false;
      }
      return true;
    }

    if (ar === br && clearRow(ar, ac, bc)) return true;
    if (ac === bc && clearCol(ac, ar, br)) return true;

    if (isEmpty(ar, bc) && clearRow(ar, ac, bc) && clearCol(bc, ar, br)) return true;
    if (isEmpty(br, ac) && clearCol(ac, ar, br) && clearRow(br, ac, bc)) return true;

    for (var r = 0; r < maxR; r++) {
      if (r === ar || r === br) continue;
      if (isEmpty(r, ac) && isEmpty(r, bc) && clearCol(ac, ar, r) && clearCol(bc, br, r) && clearRow(r, ac, bc)) return true;
    }
    for (var c = 0; c < maxC; c++) {
      if (c === ac || c === bc) continue;
      if (isEmpty(ar, c) && isEmpty(br, c) && clearRow(ar, ac, c) && clearRow(br, bc, c) && clearCol(c, ar, br)) return true;
    }

    return false;
  }

  function removePair(idxA, idxB) {
    var a = tiles[idxA], b = tiles[idxB];
    a.removed = true;
    b.removed = true;
    pairsLeft--;

    var pa = getTilePos(a), pb = getTilePos(b);
    Effects.emitLine(pa.x + TILE_W / 2, pa.y + TILE_H / 2, pb.x + TILE_W / 2, pb.y + TILE_H / 2, 15, '#FFD700', {
      speedMin: 40, speedMax: 120, sizeMin: 2, sizeMax: 6, lifeMin: 0.3, lifeMax: 0.7
    });
    Effects.emit(pa.x + TILE_W / 2, pa.y + TILE_H / 2, 10, '#FFD700', {
      speedMin: 50, speedMax: 150, sizeMin: 2, sizeMax: 5
    });
    Effects.emit(pb.x + TILE_W / 2, pb.y + TILE_H / 2, 10, '#FFD700', {
      speedMin: 50, speedMax: 150, sizeMin: 2, sizeMax: 5
    });

    score += 10;
    if (pairsLeft === 0) {
      gameState = 'won';
      congratsTime = 0;
      Effects.emit(canvas.width / 2, canvas.height / 2, 60, '#FFD700', { speedMin: 80, speedMax: 300, lifeMin: 0.5, lifeMax: 2 });
      Effects.shake(6);
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
    if (p.y < 60 && p.x < 60) { onBack(); return; }
    if (gameState === 'won') { onBack(); return; }
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
    Effects.update(dt);
  }

  function render() {
    var shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawHeader();
    drawAllTiles();
    drawSelectionHighlight();
    Effects.render(ctx);

    if (gameState === 'won') drawWinScreen();

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

  function drawWinScreen() {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var alpha = Math.min(1, congratsTime);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('Clear!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText('Tap to go back', canvas.width / 2, canvas.height / 2 + 50);
    ctx.globalAlpha = 1;
  }

  function destroy() {
    unbindInput();
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
