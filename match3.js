const Match3 = (function () {
  'use strict';

  var COLS = 8, ROWS = 8, GEM = 54, GAP = 3;
  var BOARD_W, BOARD_H, GRID_X, GRID_Y;
  var canvas, ctx, onBack;
  var grid, score, combo, timeLeft;
  var selected, animState, animTimer, matchCells, swapData, removalData;
  var pointerDown, pointerCell, swipeStart;
  var gameOverTime;
  var gemColors;
  var hintTimer, hintCells;
  var fallData;
  var scorePopups;
  var specialGems;
  var highScore;
  var difficulty;

  var GEM_NORMAL = 0;
  var GEM_LINE_H = 1;
  var GEM_LINE_V = 2;
  var GEM_BOMB = 3;
  var GEM_RAINBOW = 4;

  function init(cnv, ctxt, backCb, diff) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    difficulty = diff || 'normal';
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
  }

  function resetGame() {
    grid = [];
    specialGems = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      specialGems[r] = [];
      for (var c = 0; c < COLS; c++) {
        var t;
        do { t = Math.floor(Math.random() * 6); }
        while (wouldMatch(r, c, t));
        grid[r][c] = t;
        specialGems[r][c] = GEM_NORMAL;
      }
    }
    score = 0;
    combo = 0;
    if (difficulty === 'easy') timeLeft = 90;
    else if (difficulty === 'hard') timeLeft = 45;
    else timeLeft = 60;
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
    hintTimer = 0;
    hintCells = null;
    fallData = null;
    scorePopups = [];
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
    var tmpS = specialGems[a.r][a.c];
    specialGems[a.r][a.c] = specialGems[b.r][b.c];
    specialGems[b.r][b.c] = tmpS;
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

  function classifyMatches(matched) {
    var hGroups = {};
    var vGroups = {};
    var seen = {};
    for (var i = 0; i < matched.length; i++) {
      var key = matched[i].r + ',' + matched[i].c;
      seen[key] = matched[i];
    }

    for (var r2 = 0; r2 < ROWS; r2++) {
      for (var c2 = 0; c2 < COLS; c2++) {
        var k2 = r2 + ',' + c2;
        if (!seen[k2]) continue;
        var runEnd = c2;
        while (runEnd + 1 < COLS && seen[r2 + ',' + (runEnd + 1)]) runEnd++;
        var len = runEnd - c2 + 1;
        if (len >= 3) {
          for (var cc = c2; cc <= runEnd; cc++) {
            if (!hGroups[r2]) hGroups[r2] = [];
            hGroups[r2].push(cc);
          }
        }
        c2 = Math.max(c2, runEnd - 1);
      }
    }
    for (var c3 = 0; c3 < COLS; c3++) {
      for (var r3 = 0; r3 < ROWS; r3++) {
        var k3 = r3 + ',' + c3;
        if (!seen[k3]) continue;
        var runEnd2 = r3;
        while (runEnd2 + 1 < ROWS && seen[(runEnd2 + 1) + ',' + c3]) runEnd2++;
        if (runEnd2 - r3 + 1 >= 3) {
          if (!vGroups[c3]) vGroups[c3] = [];
          for (var rr = r3; rr <= runEnd2; rr++) vGroups[c3].push(rr);
        }
      }
    }

    var specials = [];
    var cellKeys = {};

    for (var rk in hGroups) {
      var row = parseInt(rk);
      var cols = hGroups[rk];
      if (cols.length === 4) {
        var midC = cols[1];
        specials.push({ r: row, c: midC, type: GEM_LINE_H });
        cellKeys[row + ',' + midC] = true;
      } else if (cols.length >= 5) {
        var midC2 = cols[Math.floor(cols.length / 2)];
        specials.push({ r: row, c: midC2, type: GEM_RAINBOW });
        cellKeys[row + ',' + midC2] = true;
      }
    }
    for (var ck in vGroups) {
      var col = parseInt(ck);
      var ros = vGroups[ck];
      if (ros.length === 4) {
        var midR = ros[1];
        var ck2 = midR + ',' + col;
        if (!cellKeys[ck2]) {
          specials.push({ r: midR, c: col, type: GEM_LINE_V });
          cellKeys[ck2] = true;
        }
      } else if (ros.length >= 5) {
        var midR2 = ros[Math.floor(ros.length / 2)];
        var ck3 = midR2 + ',' + col;
        if (!cellKeys[ck3]) {
          specials.push({ r: midR2, c: col, type: GEM_RAINBOW });
          cellKeys[ck3] = true;
        }
      }
    }

    var overlapCounts = {};
    for (var m = 0; m < matched.length; m++) {
      var mk = matched[m].r + ',' + matched[m].c;
      var inH = hGroups[matched[m].r] && hGroups[matched[m].r].indexOf(matched[m].c) >= 0;
      var inV = vGroups[matched[m].c] && vGroups[matched[m].c].indexOf(matched[m].r) >= 0;
      if (inH && inV) {
        overlapCounts[mk] = true;
      }
    }
    for (var ok in overlapCounts) {
      var parts = ok.split(',');
      var or2 = parseInt(parts[0]), oc2 = parseInt(parts[1]);
      var alreadySpecial = false;
      for (var si = 0; si < specials.length; si++) {
        if (specials[si].r === or2 && specials[si].c === oc2) { alreadySpecial = true; break; }
      }
      if (!alreadySpecial) {
        specials.push({ r: or2, c: oc2, type: GEM_BOMB });
      }
    }

    return { specials: specials };
  }

  function activateSpecial(r, c, specialType, gemColor) {
    var toRemove = {};
    if (specialType === GEM_LINE_H) {
      for (var cc = 0; cc < COLS; cc++) toRemove[r + ',' + cc] = { r: r, c: cc };
    } else if (specialType === GEM_LINE_V) {
      for (var rr = 0; rr < ROWS; rr++) toRemove[rr + ',' + c] = { r: rr, c: c };
    } else if (specialType === GEM_BOMB) {
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          var nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) toRemove[nr + ',' + nc] = { r: nr, c: nc };
        }
      }
    } else if (specialType === GEM_RAINBOW) {
      for (var rr2 = 0; rr2 < ROWS; rr2++) {
        for (var cc2 = 0; cc2 < COLS; cc2++) {
          if (grid[rr2][cc2] === gemColor) toRemove[rr2 + ',' + cc2] = { r: rr2, c: cc2 };
        }
      }
    }
    var result = [];
    for (var k in toRemove) result.push(toRemove[k]);
    return result;
  }

  function applyGravity() {
    for (var c = 0; c < COLS; c++) {
      var writeRow = ROWS - 1;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (grid[r][c] >= 0) {
          grid[writeRow][c] = grid[r][c];
          specialGems[writeRow][c] = specialGems[r][c];
          if (writeRow !== r) {
            grid[r][c] = -1;
            specialGems[r][c] = GEM_NORMAL;
          }
          writeRow--;
        }
      }
      while (writeRow >= 0) {
        grid[writeRow][c] = Math.floor(Math.random() * 6);
        specialGems[writeRow][c] = GEM_NORMAL;
        writeRow--;
      }
    }
  }

  function beginSwap(a, b) {
    swapData = { a: a, b: b };
    animState = 'swap';
    animTimer = 0.15;
    selected = null;
    hintTimer = 0;
    hintCells = null;
  }

  function beginSwapBack(a, b) {
    swap(a, b);
    swapData = { a: a, b: b };
    animState = 'swapback';
    animTimer = 0.15;
    Sound.invalid();
  }

  function beginRemoval(cells) {
    var info = classifyMatches(cells);
    var specialList = info.specials;

    var allToRemove = {};
    for (var i = 0; i < cells.length; i++) {
      allToRemove[cells[i].r + ',' + cells[i].c] = cells[i];
    }

    for (var s = 0; s < specialList.length; s++) {
      var sp = specialList[s];
      var spColor = grid[sp.r][sp.c];
      specialGems[sp.r][sp.c] = sp.type;

      var extras = activateSpecial(sp.r, sp.c, sp.type, spColor);
      for (var e = 0; e < extras.length; e++) {
        allToRemove[extras[e].r + ',' + extras[e].c] = extras[e];
      }
    }

    var uniqueCells = [];
    var keys = Object.keys(allToRemove);
    for (var k = 0; k < keys.length; k++) {
      uniqueCells.push(allToRemove[keys[k]]);
    }

    removalData = [];
    animState = 'remove';
    animTimer = 0.35;
    matchCells = [];

    combo++;
    var baseScore = uniqueCells.length * 10 * combo;
    score += baseScore;

    if (combo > 1) Sound.combo(combo);
    else Sound.match();

    var popP = cellCenter(Math.round(uniqueCells.reduce(function(s, c2) { return s + c2.r; }, 0) / uniqueCells.length),
                           Math.round(uniqueCells.reduce(function(s, c2) { return s + c2.c; }, 0) / uniqueCells.length));
    scorePopups.push({ x: popP.x, y: popP.y, text: '+' + baseScore, life: 1.0, maxLife: 1.0, color: combo > 1 ? '#FFD700' : '#FFFFFF' });

    for (var i2 = 0; i2 < uniqueCells.length; i2++) {
      var p = cellCenter(uniqueCells[i2].r, uniqueCells[i2].c);
      var gcIdx = grid[uniqueCells[i2].r][uniqueCells[i2].c];
      var gc2 = (gcIdx >= 0 && gcIdx < gemColors.length) ? gemColors[gcIdx] : gemColors[0];
      Effects.emit(p.x, p.y, 8, gc2.light, { speedMin: 50, speedMax: 140, sizeMin: 3, sizeMax: 7, lifeMin: 0.3, lifeMax: 0.7 });

      var isExistingSpecial = false;
      for (var si = 0; si < specialList.length; si++) {
        if (specialList[si].r === uniqueCells[i2].r && specialList[si].c === uniqueCells[i2].c) {
          isExistingSpecial = true;
          break;
        }
      }
      removalData.push({ r: uniqueCells[i2].r, c: uniqueCells[i2].c, type: gcIdx >= 0 ? gcIdx : 0, special: specialGems[uniqueCells[i2].r][uniqueCells[i2].c] });
    }
    Effects.shake(combo * 1.5);

    for (var j = 0; j < uniqueCells.length; j++) {
      grid[uniqueCells[j].r][uniqueCells[j].c] = -1;
      specialGems[uniqueCells[j].r][uniqueCells[j].c] = GEM_NORMAL;
    }
  }

  function hasValidMoves() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (c + 1 < COLS) {
          swap({ r: r, c: c }, { r: r, c: c + 1 });
          var m1 = findMatches();
          swap({ r: r, c: c }, { r: r, c: c + 1 });
          if (m1.length > 0) return true;
        }
        if (r + 1 < ROWS) {
          swap({ r: r, c: c }, { r: r + 1, c: c });
          var m2 = findMatches();
          swap({ r: r, c: c }, { r: r + 1, c: c });
          if (m2.length > 0) return true;
        }
      }
    }
    return false;
  }

  function findHintPair() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (c + 1 < COLS) {
          swap({ r: r, c: c }, { r: r, c: c + 1 });
          var m1 = findMatches();
          swap({ r: r, c: c }, { r: r, c: c + 1 });
          if (m1.length > 0) return [{ r: r, c: c }, { r: r, c: c + 1 }];
        }
        if (r + 1 < ROWS) {
          swap({ r: r, c: c }, { r: r + 1, c: c });
          var m2 = findMatches();
          swap({ r: r, c: c }, { r: r + 1, c: c });
          if (m2.length > 0) return [{ r: r, c: c }, { r: r + 1, c: c }];
        }
      }
    }
    return null;
  }

  function shuffleBoard() {
    var attempts = 0;
    do {
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var r2 = Math.floor(Math.random() * ROWS);
          var c2 = Math.floor(Math.random() * COLS);
          var tmp = grid[r][c];
          grid[r][c] = grid[r2][c2];
          grid[r2][c2] = tmp;
          var tmpS = specialGems[r][c];
          specialGems[r][c] = specialGems[r2][c2];
          specialGems[r2][c2] = tmpS;
        }
      }
      attempts++;
    } while (attempts < 50 && !hasValidMoves());

    if (!hasValidMoves()) {
      for (var r3 = 0; r3 < ROWS; r3++) {
        for (var c3 = 0; c3 < COLS; c3++) {
          grid[r3][c3] = -1;
          specialGems[r3][c3] = GEM_NORMAL;
        }
      }
      for (var r4 = 0; r4 < ROWS; r4++) {
        for (var c4 = 0; c4 < COLS; c4++) {
          var t;
          do { t = Math.floor(Math.random() * 6); }
          while (wouldMatch(r4, c4, t));
          grid[r4][c4] = t;
        }
      }
    }

    Effects.emit(canvas.width / 2, canvas.height / 2, 30, '#3B82F6', { speedMin: 60, speedMax: 180, sizeMin: 3, sizeMax: 7 });
    scorePopups.push({ x: canvas.width / 2, y: canvas.height / 2 - 50, text: 'Shuffled!', life: 1.5, maxLife: 1.5, color: '#3B82F6' });
    Sound.invalid();
  }

  function update(dt) {
    for (var i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].life -= dt;
      scorePopups[i].y -= 30 * dt;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }

    if (animState === 'gameover') {
      gameOverTime += dt;
      Effects.update(dt);
      return;
    }

    if (timeLeft > 0 && animState !== 'remove' && animState !== 'swap' && animState !== 'swapback' && animState !== 'fall') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        animState = 'gameover';
        gameOverTime = 0;
        Sound.gameover();
        Effects.emit(canvas.width / 2, canvas.height / 2, 40, '#FFD700', {
          speedMin: 80, speedMax: 250, lifeMin: 0.5, lifeMax: 1.5, sizeMin: 3, sizeMax: 8
        });
        return;
      }
    }

    if (animState === 'idle') {
      hintTimer += dt;
      if (hintTimer > 5 && !hintCells) {
        hintCells = findHintPair();
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
        startFallAnimation();
        removalData = null;
        combo = 0;
      }
    }

    if (animState === 'fall') {
      animTimer -= dt;
      if (animTimer <= 0) {
        fallData = null;
        var newMatches = findMatches();
        if (newMatches.length > 0) {
          beginRemoval(newMatches);
        } else {
          animState = 'idle';
          if (!hasValidMoves()) {
            shuffleBoard();
          }
        }
      }
    }

    Effects.update(dt);
  }

  function startFallAnimation() {
    animState = 'fall';
    animTimer = 0.2;
    fallData = true;
  }

  function render() {
    var shake = Effects.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    drawBoard();
    drawTimerAndScore();

    if (animState === 'swap' || animState === 'swapback') {
      // swap animation is handled in drawBoard
    }
    if (animState === 'remove') {
      drawRemovalAnimation();
    }

    Effects.render(ctx);

    drawScorePopups();

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

        var sp = specialGems[r][c];
        if (sp !== GEM_NORMAL) {
          drawSpecialOverlay(sx, sy, sp, grid[r][c]);
        }
      }
    }

    if (hintCells && animState === 'idle') {
      var pulse = 0.5 + 0.5 * Math.sin(hintTimer * 6);
      for (var h = 0; h < hintCells.length; h++) {
        var hc = cellCenter(hintCells[h].r, hintCells[h].c);
        ctx.strokeStyle = 'rgba(255, 215, 0, ' + pulse + ')';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(hc.x - GEM / 2, hc.y - GEM / 2, GEM, GEM, 8);
        ctx.stroke();
        ctx.shadowBlur = 0;
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

  function drawSpecialOverlay(x, y, spType, gemType) {
    var cx = x + GEM / 2;
    var cy = y + GEM / 2;

    if (spType === GEM_LINE_H) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy);
      ctx.lineTo(cx + 12, cy);
      var ax = cx + 8;
      ctx.moveTo(ax, cy - 5);
      ctx.lineTo(ax + 5, cy);
      ctx.lineTo(ax, cy + 5);
      ctx.moveTo(cx - 8 - 5, cy - 5);
      ctx.lineTo(cx - 8 - 5, cy + 5);
      ctx.lineTo(cx - 8, cy);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (spType === GEM_LINE_V) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 12);
      ctx.lineTo(cx, cy + 12);
      ctx.moveTo(cx - 5, cy - 8);
      ctx.lineTo(cx, cy - 8 - 5);
      ctx.lineTo(cx + 5, cy - 8);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (spType === GEM_BOMB) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
    } else if (spType === GEM_RAINBOW) {
      var colors = ['#FF4757', '#FFA502', '#2ED573', '#3B82F6', '#A855F7', '#EC4899'];
      for (var i = 0; i < 6; i++) {
        var a2 = (i / 6) * Math.PI * 2 - Math.PI / 2;
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a2) * 10, cy + Math.sin(a2) * 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();
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

  function drawScorePopups() {
    for (var i = 0; i < scorePopups.length; i++) {
      var sp = scorePopups[i];
      var alpha = Math.max(0, sp.life / sp.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
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
    ctx.fillStyle = 'rgba(243, 229, 245, 0.92)';
    ctx.fillRect(0, 0, canvas.width, 85);

    ctx.strokeStyle = 'rgba(206, 147, 216, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 85);
    ctx.lineTo(canvas.width, 85);
    ctx.stroke();

    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#AD1457';
    ctx.fillText('\u2728 ' + score, 16, 30);

    ctx.textAlign = 'right';
    var tColor = timeLeft <= 10 ? '#E53935' : '#5C6BC0';
    ctx.fillStyle = tColor;
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.fillText(Math.ceil(timeLeft) + 's', canvas.width - 16, 30);

    var barX = 16;
    var barY = 50;
    var barW = canvas.width - 32;
    var barH = 12;
    var progress = Math.max(0, timeLeft / 60);

    ctx.fillStyle = '#E8EAF6';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    var barColor;
    if (progress > 0.5) barColor = '#66BB6A';
    else if (progress > 0.25) barColor = '#FFA726';
    else barColor = '#EF5350';

    if (progress > 0.01) {
      var barGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      barGrad.addColorStop(0, barColor);
      barGrad.addColorStop(1, barColor + 'CC');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progress, barH, 6);
      ctx.fill();

      ctx.save();
      ctx.shadowColor = barColor;
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'transparent';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progress, barH, 6);
      ctx.fill();
      ctx.restore();
    }

    if (combo > 1 && (animState === 'remove' || animState === 'fall')) {
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF6B81';
      ctx.fillText('\u2B50 COMBO x' + combo + '!', canvas.width / 2, 75);
    }

    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#AB47BC';
    ctx.fillText('\u2190 Back', 16, 76);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(243, 229, 245, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    ctx.save();
    ctx.shadowColor = 'rgba(156, 39, 176, 0.2)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(cx - 130, cy - 130, 260, 280, 20);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = '#CE93D8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 130, cy - 130, 260, 280, 20);
    ctx.stroke();

    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E91E63';
    ctx.fillText("\u23F0 Time's Up!", cx, cy - 80);

    ctx.font = 'bold 24px "Segoe UI", sans-serif';
    ctx.fillStyle = '#424242';
    ctx.fillText('\u2B50 ' + score, cx, cy - 35);

    if (highScore !== undefined && highScore !== null) {
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillStyle = score >= highScore ? '#FF9800' : '#9E9E9E';
      ctx.fillText(score >= highScore ? '\u{1F3C6} New Record!' : 'Best: ' + highScore, cx, cy);
    }

    var btnW = 200, btnH = 46, btnY = cy + 25;
    ctx.save();
    ctx.shadowColor = 'rgba(233, 30, 99, 0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#E91E63';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btnY, btnW, btnH, 12);
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u25B6 Retry', cx, btnY + btnH / 2);

    var btn2Y = btnY + btnH + 12;
    ctx.fillStyle = '#78909C';
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
ctx.fillText('\u{1F3E0} Menu', cx, btn2Y + btnH / 2);
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
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var btnW = 200, btnH = 50, btnY = cy + 50;
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
    hintTimer = 0;
    hintCells = null;
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
    gemCache = {};
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