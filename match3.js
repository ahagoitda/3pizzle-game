const Match3 = (function () {
  'use strict';

  var COLS = 8, ROWS = 8, GEM = 54, GAP = 3;
  var BOARD_W, BOARD_H, GRID_X, GRID_Y;
  var canvas, ctx, onBack;
  var grid, score, combo, timeLeft, lockedGems;
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
  var maxTime;
  var mouseX = -1000;
  var mouseY = -1000;
  var gemImages = [];
  var gemLoadedCount = 0;
  var gemsLoaded = false;
  var numColors = 6;
  var feverGauge = 0;
  var feverActive = false;
  var feverTimeLeft = 0;
  var itemHammerCount = 1;
  var itemShuffleCount = 1;
  var activeItem = null;
  var linkedPath = [];
  var isLinking = false;
  var targetScore = 1000;
  var currentLevelId = '1-1';

  var GEM_NORMAL = 0;
  var GEM_LINE_H = 1;
  var GEM_LINE_V = 2;
  var GEM_BOMB = 3;
  var GEM_RAINBOW = 4;

  function init(cnv, ctxt, backCb, diff, lvlId) {
    canvas = cnv;
    ctx = ctxt;
    onBack = backCb;
    difficulty = diff || 'normal';
    currentLevelId = lvlId || '1-1';

    var lvl = Match3Levels.getLevel(currentLevelId);
    targetScore = lvl.target;
    timeLeft = lvl.time;
    maxTime = timeLeft;
    numColors = lvl.colors;

    GEM = Math.floor((canvas.width - 32 - (COLS - 1) * GAP) / COLS);
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

    preloadImages();

    resetGame();
    bindInput();
  }

  function preloadImages() {
    if (gemsLoaded) return;
    gemImages = [];
    gemLoadedCount = 0;
    var paths = [
      'assets/gem_red.png',
      'assets/gem_green.png',
      'assets/gem_orange.png',
      'assets/gem_purple.png',
      'assets/gem_blue.png',
      'assets/gem_pink.png'
    ];
    for (var i = 0; i < 6; i++) {
      var img = new Image();
      img.src = paths[i];
      img.onload = function() {
        gemLoadedCount++;
        if (gemLoadedCount === 6) {
          gemsLoaded = true;
        }
      };
      gemImages.push(img);
    }
  }

  function resetGame() {
    var lvl = Match3Levels.getLevel(currentLevelId);
    if (difficulty === 'easy') {
      numColors = Math.max(4, lvl.colors - 1);
      targetScore = Math.round(lvl.target * 0.7);
      timeLeft = Math.round(lvl.time * 1.2);
    } else if (difficulty === 'hard') {
      numColors = Math.min(6, lvl.colors + 1);
      targetScore = Math.round(lvl.target * 1.3);
      timeLeft = Math.round(lvl.time * 0.85);
    } else {
      numColors = lvl.colors;
      targetScore = lvl.target;
      timeLeft = lvl.time;
    }
    maxTime = timeLeft;

    grid = [];
    specialGems = [];
    lockedGems = [];
    for (var r = 0; r < ROWS; r++) {
      grid[r] = [];
      specialGems[r] = [];
      lockedGems[r] = [];
      for (var c = 0; c < COLS; c++) {
        var t;
        do { t = Math.floor(Math.random() * numColors); }
        while (wouldMatch(r, c, t));
        grid[r][c] = t;
        specialGems[r][c] = GEM_NORMAL;
        lockedGems[r][c] = false;
      }
    }
    initializeLocks();
    score = 0;
    combo = 0;
    selected = null;
    linkedPath = [];
    isLinking = false;
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
    feverGauge = 0;
    feverActive = false;
    feverTimeLeft = 0;
    itemHammerCount = 1;
    itemShuffleCount = 1;
    activeItem = null;
    Effects.reset();
  }

  function wouldMatch(r, c, type) {
    if (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) return true;
    if (r >= 2 && grid[r - 1] && grid[r - 1][c] === type && grid[r - 2] && grid[r - 2][c] === type) return true;
    return false;
  }

  function initializeLocks() {
    var lvl = Match3Levels.getLevel(currentLevelId);
    var world = lvl.world;
    var lvlNum = parseInt(lvl.id.split('-')[1], 10) || 1;

    if (world === 1) {
      return;
    }

    if (world === 2) {
      if (lvlNum === 2) {
        lockedGems[3][3] = true;
        lockedGems[4][4] = true;
      } else if (lvlNum === 3) {
        lockedGems[2][3] = true;
        lockedGems[4][2] = true;
        lockedGems[5][4] = true;
      } else if (lvlNum === 4) {
        lockedGems[2][2] = true;
        lockedGems[2][5] = true;
        lockedGems[5][2] = true;
        lockedGems[5][5] = true;
      } else if (lvlNum === 5) {
        lockedGems[2][2] = true;
        lockedGems[2][5] = true;
        lockedGems[3][3] = true;
        lockedGems[4][4] = true;
        lockedGems[5][2] = true;
        lockedGems[5][5] = true;
      }
    } else if (world === 3) {
      if (lvlNum === 1) {
        lockedGems[1][3] = true;
        lockedGems[3][1] = true;
        lockedGems[3][5] = true;
        lockedGems[5][3] = true;
      } else if (lvlNum === 2) {
        lockedGems[2][2] = true;
        lockedGems[3][2] = true;
        lockedGems[4][2] = true;
        lockedGems[2][5] = true;
        lockedGems[3][5] = true;
        lockedGems[4][5] = true;
      } else if (lvlNum === 3) {
        lockedGems[3][1] = true;
        lockedGems[3][2] = true;
        lockedGems[3][3] = true;
        lockedGems[3][4] = true;
        lockedGems[3][5] = true;
        lockedGems[3][6] = true;
      } else if (lvlNum === 4) {
        lockedGems[1][1] = true;
        lockedGems[1][6] = true;
        lockedGems[3][3] = true;
        lockedGems[3][4] = true;
        lockedGems[4][3] = true;
        lockedGems[4][4] = true;
        lockedGems[6][1] = true;
        lockedGems[6][6] = true;
      } else if (lvlNum === 5) {
        lockedGems[2][3] = true;
        lockedGems[2][4] = true;
        lockedGems[3][2] = true;
        lockedGems[3][5] = true;
        lockedGems[4][2] = true;
        lockedGems[4][5] = true;
        lockedGems[5][3] = true;
        lockedGems[5][4] = true;
      }
    } else if (world === 4) {
      if (lvlNum === 1) {
        lockedGems[1][1] = true;
        lockedGems[2][2] = true;
        lockedGems[5][5] = true;
        lockedGems[6][6] = true;
      } else if (lvlNum === 2) {
        lockedGems[3][2] = true;
        lockedGems[3][5] = true;
        lockedGems[4][2] = true;
        lockedGems[4][5] = true;
      } else if (lvlNum === 3) {
        lockedGems[2][2] = true;
        lockedGems[4][2] = true;
        lockedGems[3][3] = true;
        lockedGems[3][4] = true;
        lockedGems[2][5] = true;
        lockedGems[4][5] = true;
      } else if (lvlNum === 4) {
        lockedGems[1][2] = true;
        lockedGems[1][3] = true;
        lockedGems[1][4] = true;
        lockedGems[1][5] = true;
        lockedGems[6][3] = true;
        lockedGems[6][4] = true;
      } else if (lvlNum === 5) {
        lockedGems[1][3] = true;
        lockedGems[1][4] = true;
        lockedGems[3][1] = true;
        lockedGems[4][1] = true;
        lockedGems[3][6] = true;
        lockedGems[4][6] = true;
        lockedGems[6][3] = true;
        lockedGems[6][4] = true;
      }
    } else if (world === 5) {
      if (lvlNum === 1) {
        lockedGems[2][3] = true;
        lockedGems[2][4] = true;
        lockedGems[3][1] = true;
        lockedGems[3][6] = true;
        lockedGems[4][3] = true;
        lockedGems[4][4] = true;
      } else if (lvlNum === 2) {
        lockedGems[1][1] = true;
        lockedGems[1][6] = true;
        lockedGems[3][2] = true;
        lockedGems[3][5] = true;
        lockedGems[4][2] = true;
        lockedGems[4][5] = true;
        lockedGems[6][1] = true;
        lockedGems[6][6] = true;
      } else if (lvlNum === 3) {
        lockedGems[2][2] = true;
        lockedGems[3][2] = true;
        lockedGems[4][2] = true;
        lockedGems[5][2] = true;
        lockedGems[2][5] = true;
        lockedGems[3][5] = true;
        lockedGems[4][5] = true;
        lockedGems[5][5] = true;
      } else if (lvlNum === 4) {
        lockedGems[1][1] = true;
        lockedGems[1][3] = true;
        lockedGems[1][5] = true;
        lockedGems[3][1] = true;
        lockedGems[3][6] = true;
        lockedGems[4][1] = true;
        lockedGems[4][6] = true;
        lockedGems[6][1] = true;
        lockedGems[6][3] = true;
        lockedGems[6][5] = true;
      } else if (lvlNum === 5) {
        lockedGems[1][1] = true;
        lockedGems[1][3] = true;
        lockedGems[1][5] = true;
        lockedGems[2][2] = true;
        lockedGems[2][4] = true;
        lockedGems[2][6] = true;
        lockedGems[4][1] = true;
        lockedGems[4][3] = true;
        lockedGems[4][5] = true;
        lockedGems[5][2] = true;
        lockedGems[5][4] = true;
        lockedGems[5][6] = true;
      }
    }
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

  function wouldCreateMatch(r, c, type) {
    // Horizontal match check
    if (c >= 2 && grid[r][c - 1] === type && grid[r][c - 2] === type) return true;
    if (c < COLS - 2 && grid[r][c + 1] === type && grid[r][c + 2] === type) return true;
    if (c >= 1 && c < COLS - 1 && grid[r][c - 1] === type && grid[r][c + 1] === type) return true;

    // Vertical match check
    if (r >= 2 && grid[r - 1] && grid[r - 1][c] === type && grid[r - 2] && grid[r - 2][c] === type) return true;
    if (r < ROWS - 2 && grid[r + 1] && grid[r + 1][c] === type && grid[r + 2] && grid[r + 2][c] === type) return true;
    if (r >= 1 && r < ROWS - 1 && grid[r - 1] && grid[r - 1][c] === type && grid[r + 1] && grid[r + 1][c] === type) return true;

    return false;
  }

  function applyGravity() {
    // Pass 1: Shift existing gems down, leave empty slots as -1
    for (var c = 0; c < COLS; c++) {
      var nonLocked = [];
      for (var r = ROWS - 1; r >= 0; r--) {
        if (!lockedGems[r][c] && grid[r][c] >= 0) {
          nonLocked.push({ type: grid[r][c], special: specialGems[r][c] });
        }
      }
      
      var idx = 0;
      for (var r = ROWS - 1; r >= 0; r--) {
        if (!lockedGems[r][c]) {
          if (idx < nonLocked.length) {
            grid[r][c] = nonLocked[idx].type;
            specialGems[r][c] = nonLocked[idx].special;
            idx++;
          } else {
            grid[r][c] = -1;
            specialGems[r][c] = GEM_NORMAL;
          }
        }
      }
    }

    // Determine cascade prevention probability based on difficulty and combo count
    var preventMatches = false;
    var roll = Math.random();
    
    if (difficulty === 'easy') {
      if (combo === 1) {
        if (roll < 0.45) preventMatches = true; // 45% chance to prevent cascade
      } else if (combo === 2) {
        if (roll < 0.75) preventMatches = true; // 75% chance to prevent cascade
      } else if (combo >= 3) {
        preventMatches = true; // 100% chance to prevent cascade
      }
    } else if (difficulty === 'hard') {
      if (combo === 1) {
        if (roll < 0.90) preventMatches = true; // 90% chance to prevent cascade
      } else if (combo >= 2) {
        preventMatches = true; // 100% chance to prevent cascade (max 1 auto cascade)
      }
    } else { // normal
      if (combo === 1) {
        if (roll < 0.75) preventMatches = true; // 75% chance to prevent cascade
      } else if (combo === 2) {
        if (roll < 0.95) preventMatches = true; // 95% chance to prevent cascade
      } else if (combo >= 3) {
        preventMatches = true; // 100% chance to prevent cascade
      }
    }

    // Pass 2: Spawn new gems in empty slots
    for (var r = ROWS - 1; r >= 0; r--) {
      for (var c = 0; c < COLS; c++) {
        if (grid[r][c] === -1) {
          var special = GEM_NORMAL;
          if (feverActive && Math.random() < 0.08) {
            special = Math.floor(Math.random() * 3) + 1;
          }

          var newGem = -1;
          if (preventMatches) {
            // Find a color that does not create a match
            var colorsList = [];
            for (var ci = 0; ci < numColors; ci++) {
              colorsList.push(ci);
            }
            // Shuffle colorsList to randomize color selection
            for (var i = colorsList.length - 1; i > 0; i--) {
              var j = Math.floor(Math.random() * (i + 1));
              var temp = colorsList[i];
              colorsList[i] = colorsList[j];
              colorsList[j] = temp;
            }

            for (var i = 0; i < colorsList.length; i++) {
              var col = colorsList[i];
              if (!wouldCreateMatch(r, c, col)) {
                newGem = col;
                break;
              }
            }
          }

          if (newGem === -1) {
            newGem = Math.floor(Math.random() * numColors);
          }

          grid[r][c] = newGem;
          specialGems[r][c] = special;
        }
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

  function beginRemoval(cells, isLinkClear, manualSpecial) {
    var specialList = [];
    if (isLinkClear) {
      if (manualSpecial) {
        specialList.push(manualSpecial);
      }
    } else {
      var info = classifyMatches(cells);
      specialList = info.specials;
    }

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
    var lockBrokenThisStep = false;
    for (var k = 0; k < keys.length; k++) {
      var cell = allToRemove[keys[k]];
      if (lockedGems[cell.r][cell.c]) {
        lockedGems[cell.r][cell.c] = false;
        lockBrokenThisStep = true;
        var cp = cellCenter(cell.r, cell.c);
        Effects.emit(cp.x, cp.y, 12, '#B0BEC5', { speedMin: 50, speedMax: 150, sizeMin: 3, sizeMax: 6, lifeMin: 0.4, lifeMax: 0.8 });
        continue;
      }
      uniqueCells.push(cell);
    }

    if (lockBrokenThisStep) {
      Sound.lockBreak();
    }

    removalData = [];
    animState = 'remove';
    animTimer = 0.35;
    matchCells = [];

    combo++;
    var baseScore = uniqueCells.length * 10 * combo;
    var isFeverTriggered = false;
    if (feverActive) {
      baseScore *= 2;
    } else {
      feverGauge = Math.min(100, feverGauge + uniqueCells.length * 2.0);
      if (feverGauge >= 100) {
        feverActive = true;
        feverTimeLeft = 10;
        isFeverTriggered = true;
      }
    }
    score += baseScore;

    if (isFeverTriggered) {
      Sound.feverStart();
      Effects.emit(canvas.width / 2, canvas.height / 2, 40, '#FFD700', { speedMin: 80, speedMax: 200, sizeMin: 4, sizeMax: 8 });
      scorePopups.push({ x: canvas.width / 2, y: canvas.height / 2 - 20, text: 'FEVER TIME! ✨', life: 2.0, maxLife: 2.0, color: '#FFD700' });
    }

    if (combo > 1) Sound.combo(combo);
    else Sound.match();

    if (uniqueCells.length > 0) {
      var popP = cellCenter(Math.round(uniqueCells.reduce(function(s, c2) { return s + c2.r; }, 0) / uniqueCells.length),
                             Math.round(uniqueCells.reduce(function(s, c2) { return s + c2.c; }, 0) / uniqueCells.length));
      var scoreText = '+' + baseScore;
      if (feverActive && !isFeverTriggered) scoreText += ' FEVER!';
      scorePopups.push({ x: popP.x, y: popP.y, text: scoreText, life: 1.0, maxLife: 1.0, color: feverActive ? '#FFD700' : (combo > 1 ? '#FFD700' : '#FFFFFF') });
    } else if (lockBrokenThisStep) {
      var popP = cellCenter(Math.round(cells.reduce(function(s, c2) { return s + c2.r; }, 0) / cells.length),
                             Math.round(cells.reduce(function(s, c2) { return s + c2.c; }, 0) / cells.length));
      scorePopups.push({ x: popP.x, y: popP.y, text: 'Unlocked! 🔓', life: 1.0, maxLife: 1.0, color: '#90A4AE' });
    }

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
      var cr = uniqueCells[j].r;
      var cc = uniqueCells[j].c;
      var isSpec = false;
      for (var s2 = 0; s2 < specialList.length; s2++) {
        if (specialList[s2].r === cr && specialList[s2].c === cc) {
          isSpec = true;
          break;
        }
      }
      if (!isSpec) {
        grid[cr][cc] = -1;
        specialGems[cr][cc] = GEM_NORMAL;
      }
    }
  }

  function hasValidMoves() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (c + 1 < COLS) {
          if (!lockedGems[r][c] && !lockedGems[r][c + 1]) {
            swap({ r: r, c: c }, { r: r, c: c + 1 });
            var m1 = findMatches();
            swap({ r: r, c: c }, { r: r, c: c + 1 });
            if (m1.length > 0) return true;
          }
        }
        if (r + 1 < ROWS) {
          if (!lockedGems[r][c] && !lockedGems[r + 1][c]) {
            swap({ r: r, c: c }, { r: r + 1, c: c });
            var m2 = findMatches();
            swap({ r: r, c: c }, { r: r + 1, c: c });
            if (m2.length > 0) return true;
          }
        }
      }
    }
    return false;
  }

  function findHintPair() {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (c + 1 < COLS) {
          if (!lockedGems[r][c] && !lockedGems[r][c + 1]) {
            swap({ r: r, c: c }, { r: r, c: c + 1 });
            var m1 = findMatches();
            swap({ r: r, c: c }, { r: r, c: c + 1 });
            if (m1.length > 0) return [{ r: r, c: c }, { r: r, c: c + 1 }];
          }
        }
        if (r + 1 < ROWS) {
          if (!lockedGems[r][c] && !lockedGems[r + 1][c]) {
            swap({ r: r, c: c }, { r: r + 1, c: c });
            var m2 = findMatches();
            swap({ r: r, c: c }, { r: r + 1, c: c });
            if (m2.length > 0) return [{ r: r, c: c }, { r: r + 1, c: c }];
          }
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
          if (lockedGems[r][c]) continue;
          var r2 = Math.floor(Math.random() * ROWS);
          var c2 = Math.floor(Math.random() * COLS);
          if (lockedGems[r2][c2]) continue;

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
          if (!lockedGems[r3][c3]) {
            grid[r3][c3] = -1;
            specialGems[r3][c3] = GEM_NORMAL;
          }
        }
      }
      for (var r4 = 0; r4 < ROWS; r4++) {
        for (var c4 = 0; c4 < COLS; c4++) {
          if (lockedGems[r4][c4]) continue;
          var t;
          do { t = Math.floor(Math.random() * numColors); }
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
    if (feverActive) {
      feverTimeLeft -= dt;
      if (feverTimeLeft <= 0) {
        feverActive = false;
        feverTimeLeft = 0;
        feverGauge = 0;
      }
    }

    for (var i = scorePopups.length - 1; i >= 0; i--) {
      scorePopups[i].life -= dt;
      scorePopups[i].y -= 30 * dt;
      if (scorePopups[i].life <= 0) scorePopups.splice(i, 1);
    }

    if (animState === 'clear' || animState === 'failed' || animState === 'gameover') {
      gameOverTime += dt;
      Effects.update(dt);
      return;
    }

    if (timeLeft > 0 && animState !== 'remove' && animState !== 'swap' && animState !== 'swapback' && animState !== 'fall') {
      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        gameOverTime = 0;
        if (score >= targetScore) {
          animState = 'clear';
          Match3Levels.setUnlockedLevel(Match3Levels.getNextLevelId(currentLevelId));
          Sound.win();
          Effects.emit(canvas.width / 2, canvas.height / 2, 40, '#FFD700', {
            speedMin: 80, speedMax: 250, lifeMin: 0.5, lifeMax: 1.5, sizeMin: 3, sizeMax: 8
          });
        } else {
          animState = 'failed';
          Sound.gameover();
          Effects.emit(canvas.width / 2, canvas.height / 2, 40, '#FF3D00', {
            speedMin: 80, speedMax: 250, lifeMin: 0.5, lifeMax: 1.5, sizeMin: 3, sizeMax: 8
          });
        }
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
          combo = 0;
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

    if (animState === 'remove') {
      drawRemovalAnimation();
    }

    Effects.render(ctx);

    drawScorePopups();

    // 10초 이하 붉은색 임박 연출 (전체 화면 약간 불투명 펄스 연출)
    if (timeLeft > 0 && timeLeft <= 10 && animState !== 'gameover') {
      var pulse = 0.08 + 0.07 * Math.sin(Date.now() / 150);
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, ' + pulse + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      var borderPulse = 0.4 + 0.3 * Math.sin(Date.now() / 150);
      ctx.strokeStyle = 'rgba(255, 61, 0, ' + borderPulse + ')';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      ctx.restore();
    }

    if (animState === 'clear') {
      drawClearScreen();
    } else if (animState === 'failed') {
      drawFailedScreen();
    } else if (animState === 'gameover') {
      drawGameOver();
    } else {
      drawFeverAndItems();
    }

    // 피버 타임 연출 (화려한 무지개 테두리 펄스 및 파티클 방출)
    if (feverActive && animState !== 'gameover') {
      var pulse = 0.4 + 0.2 * Math.sin(Date.now() / 100);
      ctx.save();
      var hue = (Date.now() / 15) % 360;
      ctx.strokeStyle = 'hsla(' + hue + ', 100%, 60%, ' + pulse + ')';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
      ctx.restore();
      
      if (Math.random() < 0.15) {
        var rx = Math.random() * canvas.width;
        var ry = Math.random() * canvas.height;
        var colors = ['#FF4757', '#FFA502', '#2ED573', '#3B82F6', '#A855F7', '#EC4899'];
        var c = colors[Math.floor(Math.random() * colors.length)];
        Effects.emit(rx, ry, 2, c, { speedMin: 20, speedMax: 80, sizeMin: 2, sizeMax: 4, lifeMin: 0.2, lifeMax: 0.5 });
      }
    }

    ctx.restore();
  }

  function drawFeverAndItems() {
    var cx = canvas.width / 2;
    
    // 1. Fever Gauge
    var fX = 30;
    var fY = 566;
    var fW = canvas.width - 60;
    var fH = 10;
    
    // Background bar
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(fX, fY, fW, fH, 5);
    ctx.fill();
    
    if (feverActive) {
      // Pulsing rainbow/pink bar for fever duration
      var fProgress = Math.max(0, feverTimeLeft / 10);
      var pulse = 0.7 + 0.3 * Math.sin(Date.now() / 80);
      ctx.save();
      ctx.globalAlpha = pulse;
      var fGrad = ctx.createLinearGradient(fX, fY, fX + fW * fProgress, fY);
      fGrad.addColorStop(0, '#FF4757');
      fGrad.addColorStop(0.5, '#A855F7');
      fGrad.addColorStop(1, '#EC4899');
      ctx.fillStyle = fGrad;
      ctx.beginPath();
      ctx.roundRect(fX, fY, fW * fProgress, fH, 5);
      ctx.fill();
      ctx.restore();
      
      // Text
      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.fillStyle = '#FFD700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✨ FEVER ACTIVE (2x SCORE) ✨', cx, fY - 7);
    } else {
      // Normal progress bar
      var fProgress = Math.max(0, feverGauge / 100);
      if (fProgress > 0.001) {
        ctx.fillStyle = '#EC4899';
        ctx.beginPath();
        ctx.roundRect(fX, fY, fW * fProgress, fH, 5);
        ctx.fill();
      }
      
      ctx.font = 'bold 11px "Outfit", sans-serif';
      ctx.fillStyle = '#90A4AE';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FEVER GAUGE: ' + Math.floor(feverGauge) + '%', cx, fY - 7);
    }

    // 2. Items Slot
    var itemY = 596;
    var itemW = 100;
    var itemH = 38;
    
    // Item 1: Hammer
    var hX = cx - 110;
    var isHamHovered = (mouseX >= hX && mouseX <= hX + itemW && mouseY >= itemY && mouseY <= itemY + itemH);
    var hamColor = (activeItem === 'hammer') ? '#FFD700' : (itemHammerCount > 0 ? (isHamHovered ? '#FFFFFF' : '#90A4AE') : '#546E7A');
    var hamBg = (activeItem === 'hammer') ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.04)';
    drawRoundRect(hX, itemY, itemW, itemH, 10, hamBg, hamColor, (activeItem === 'hammer' || isHamHovered) ? 2 : 1.2);
    
    ctx.font = 'bold 13px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = hamColor;
    ctx.fillText('🔨 Hammer ' + itemHammerCount + '/1', hX + itemW / 2, itemY + itemH / 2);

    // Item 2: Shuffle
    var sX = cx + 10;
    var isShufHovered = (mouseX >= sX && mouseX <= sX + itemW && mouseY >= itemY && mouseY <= itemY + itemH);
    var shufColor = (itemShuffleCount > 0 ? (isShufHovered ? '#FFFFFF' : '#90A4AE') : '#546E7A');
    var shufBg = 'rgba(255, 255, 255, 0.04)';
    var shufBorder = isShufHovered ? '#FFFFFF' : shufColor;
    drawRoundRect(sX, itemY, itemW, itemH, 10, shufBg, shufBorder, isShufHovered ? 2 : 1.2);
    
    ctx.fillStyle = shufColor;
    ctx.fillText('🔀 Shuffle ' + itemShuffleCount + '/1', sX + itemW / 2, itemY + itemH / 2);
  }

  function drawBoard() {
    // 둥근 사각형 보드 판넬 (약간의 투명도를 가진 다크 블루/퍼플)
    ctx.save();
    ctx.shadowColor = 'rgba(103, 58, 183, 0.2)';
    ctx.shadowBlur = 20;
    drawRoundRect(GRID_X - 12, GRID_Y - 12, BOARD_W + 24, BOARD_H + 24, 18, 'rgba(21, 16, 42, 0.65)', 'rgba(103, 58, 183, 0.35)', 2);
    ctx.restore();

    // 격자 배경 셀 음영 처리
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var sx = GRID_X + c * (GEM + GAP);
        var sy = GRID_Y + r * (GEM + GAP);
        var cellColor = ((r + c) % 2 === 0) ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.04)';
        drawRoundRect(sx, sy, GEM, GEM, 10, cellColor, 'rgba(255, 255, 255, 0.02)', 1);
      }
    }

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

        var sp = specialGems[r][c];

        ctx.save();
        if (sp === GEM_BOMB) {
          var pulse = 1 + 0.06 * Math.sin(Date.now() / 150);
          ctx.translate(sx + GEM / 2, sy + GEM / 2);
          ctx.scale(pulse, pulse);
          drawGem(-GEM / 2, -GEM / 2, GEM, grid[r][c], 1);
          drawSpecialOverlay(-GEM / 2, -GEM / 2, sp, grid[r][c]);
          if (lockedGems[r][c]) {
            drawLockedOverlay(-GEM / 2, -GEM / 2);
          }
        } else {
          drawGem(sx, sy, GEM, grid[r][c], 1);
          if (sp !== GEM_NORMAL) {
            drawSpecialOverlay(sx, sy, sp, grid[r][c]);
          }
          if (lockedGems[r][c]) {
            drawLockedOverlay(sx, sy);
          }
        }
        ctx.restore();
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
        ctx.roundRect(hc.x - GEM / 2, hc.y - GEM / 2, GEM, GEM, 10);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    if (selected && animState === 'idle' && !isLinking) {
      var sc = cellCenter(selected.r, selected.c);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(sc.x - GEM / 2, sc.y - GEM / 2, GEM, GEM, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // 한붓그리기 경로 렌더링
    if (isLinking && linkedPath.length > 0) {
      var gemType = grid[linkedPath[0].r][linkedPath[0].c];
      var colorObj = gemColors[gemType] || gemColors[0];
      var lineColor = colorObj.light || '#FFFFFF';

      // 1. 네온 연결선 그리기
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 15;
      
      ctx.beginPath();
      var startPt = cellCenter(linkedPath[0].r, linkedPath[0].c);
      ctx.moveTo(startPt.x, startPt.y);
      for (var i = 1; i < linkedPath.length; i++) {
        var pt = cellCenter(linkedPath[i].r, linkedPath[i].c);
        ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.restore();

      // 2. 연결 노드 하이라이트 및 인덱스 표시
      for (var i = 0; i < linkedPath.length; i++) {
        var pt = cellCenter(linkedPath[i].r, linkedPath[i].c);
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        var pulseRad = GEM / 2.2 + 2 * Math.sin(Date.now() / 100 + i);
        ctx.arc(pt.x, pt.y, pulseRad, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.font = 'bold 13px "Outfit", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(i + 1, pt.x, pt.y);
        ctx.restore();
      }
    }
  }

  function drawSpecialOverlay(x, y, spType, gemType) {
    var cx = x + GEM / 2;
    var cy = y + GEM / 2;
    var time = Date.now() / 1000;

    if (spType === GEM_LINE_H) {
      var animOffset = (time * 25) % 12;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx - 14, cy);
      ctx.lineTo(cx + 14, cy);
      
      var rx = cx + 6 + animOffset;
      ctx.moveTo(rx - 4, cy - 4);
      ctx.lineTo(rx, cy);
      ctx.lineTo(rx - 4, cy + 4);
      
      var lx = cx - 6 - animOffset;
      ctx.moveTo(lx + 4, cy - 4);
      ctx.lineTo(lx, cy);
      ctx.lineTo(lx + 4, cy + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (spType === GEM_LINE_V) {
      var animOffset = (time * 25) % 12;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx, cy + 14);
      
      var dy = cy + 6 + animOffset;
      ctx.moveTo(cx - 4, dy - 4);
      ctx.lineTo(cx, dy);
      ctx.lineTo(cx + 4, dy - 4);
      
      var uy = cy - 6 - animOffset;
      ctx.moveTo(cx - 4, uy + 4);
      ctx.lineTo(cx, uy);
      ctx.lineTo(cx + 4, uy + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (spType === GEM_BOMB) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FF9800';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = '#FF3D00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy - 4);
      ctx.lineTo(cx + 4, cy + 4);
      ctx.moveTo(cx + 4, cy - 4);
      ctx.lineTo(cx - 4, cy + 4);
      ctx.stroke();
    } else if (spType === GEM_RAINBOW) {
      var colors = ['#FF4757', '#FFA502', '#2ED573', '#3B82F6', '#A855F7', '#EC4899'];
      var angleShift = time * 3;
      for (var i = 0; i < 6; i++) {
        var a2 = (i / 6) * Math.PI * 2 + angleShift;
        ctx.fillStyle = colors[i];
        ctx.shadowColor = colors[i];
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a2) * 11, cy + Math.sin(a2) * 11, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawLockedOverlay(x, y) {
    var cx = x + GEM / 2;
    var cy = y + GEM / 2;
    
    ctx.save();
    
    ctx.strokeStyle = 'rgba(176, 190, 197, 0.85)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + GEM - 5, y + 5);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + 5, y + GEM - 5);
    ctx.lineTo(cx, cy);
    ctx.moveTo(x + GEM - 5, y + GEM - 5);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    
    ctx.fillStyle = '#78909C';
    ctx.strokeStyle = '#37474F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 7, cy - 4, 14, 11, 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.strokeStyle = '#546E7A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 4.5, Math.PI, 0);
    ctx.stroke();
    
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(cx, cy + 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
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
      ctx.font = 'bold 20px "Outfit", "Segoe UI", sans-serif';
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
    if (gemsLoaded && gemImages[type] && gemImages[type].complete && gemImages[type].naturalWidth !== 0) {
      ctx.drawImage(gemImages[type], x, y, size, size);
      return;
    }
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
    ctx.fillStyle = 'rgba(15, 12, 26, 0.85)';
    ctx.fillRect(0, 0, canvas.width, 92);

    ctx.strokeStyle = 'rgba(103, 58, 183, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 92);
    ctx.lineTo(canvas.width, 92);
    ctx.stroke();

    var isBackHovered = (mouseX >= 10 && mouseX <= 80 && mouseY >= 10 && mouseY <= 45);
    ctx.font = 'bold 14px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isBackHovered ? '#FFFFFF' : '#90A4AE';
    ctx.fillText('\u2190 Back', 16, 28);

    var lvl = Match3Levels.getLevel(currentLevelId);
    ctx.font = 'bold 14px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#A855F7';
    ctx.fillText(lvl.name, canvas.width / 2, 28);

    ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6B81';
    ctx.fillText('\u2728 ' + score, 16, 58);

    ctx.font = '13px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFA502';
    ctx.fillText('Target: ' + targetScore, canvas.width / 2, 58);

    ctx.textAlign = 'right';
    var isUrgent = timeLeft <= 10;
    var tColor = isUrgent ? (Math.floor(Date.now() / 250) % 2 === 0 ? '#FF3D00' : '#FF8A80') : '#60A5FA';
    ctx.fillStyle = tColor;
    ctx.font = 'bold 22px "Outfit", "Segoe UI", sans-serif';
    ctx.fillText(Math.ceil(timeLeft) + 's', canvas.width - 16, 58);

    var barX = 16;
    var barY = 78;
    var barW = canvas.width - 32;
    var barH = 8;
    var progress = Math.max(0, timeLeft / maxTime);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    var barColor = isUrgent ? '#FF3D00' : '#3B82F6';
    if (progress > 0.001) {
      ctx.save();
      var barGrad = ctx.createLinearGradient(barX, barY, barX + barW * progress, barY);
      barGrad.addColorStop(0, barColor);
      barGrad.addColorStop(1, barColor + 'AA');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * progress, barH, 4);
      ctx.fill();
      ctx.restore();
    }

    if (combo > 1 && (animState === 'remove' || animState === 'fall')) {
      ctx.save();
      var comboScale = 1 + 0.15 * Math.sin(Date.now() / 80);
      ctx.translate(canvas.width / 2, 40);
      ctx.scale(comboScale, comboScale);
      ctx.font = 'bold 20px "Outfit", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFA500';
      ctx.shadowBlur = 10;
      ctx.fillText('\u2B50 ' + combo + ' COMBO!', 0, 0);
      ctx.restore();
    }
  }

  function drawClearScreen() {
    ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;
    var hasNext = Match3Levels.getNextLevelId(currentLevelId) !== null;
    var cardH = hasNext ? 340 : 280;

    var animatedScore = Math.min(score, Math.floor(score * (gameOverTime / 1.5)));

    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 0, 0.25)';
    ctx.shadowBlur = 30;
    drawRoundRect(cx - 140, cy - 140 - (hasNext ? 30 : 0), 280, cardH, 24, 'rgba(25, 18, 48, 0.85)', 'rgba(255, 255, 255, 0.08)', 1.5);
    ctx.restore();

    ctx.font = 'bold 28px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFA502';
    var textY = cy - 84 - (hasNext ? 30 : 0);
    ctx.fillText('✨ Stage Clear! ✨', cx, textY);

    ctx.font = 'bold 36px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2728 ' + animatedScore, cx, textY + 54);

    ctx.font = '13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#90A4AE';
    ctx.fillText('Target Score: ' + targetScore, cx, textY + 98);

    var btnW = 200, btnH = 44;
    var btnY = cy + 46 - (hasNext ? 30 : 0);
    var btn2Y = btnY + btnH + 12;
    var btn3Y = btn2Y + btnH + 12;

    if (hasNext) {
      var isNextHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btnY && mouseY <= btnY + btnH);
      ctx.save();
      if (isNextHovered) {
        ctx.shadowColor = 'rgba(255, 165, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 2;
      }
      var nextBg = isNextHovered ? '#FFB74D' : '#FFA502';
      var nextBorder = isNextHovered ? '#FFFFFF' : '#EF6C00';
      drawRoundRect(cx - btnW / 2, btnY, btnW, btnH, 12, nextBg, nextBorder, 1.5);
      ctx.restore();
      ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u25B6 Next Stage', cx, btnY + btnH / 2);

      var isReplayHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btn2Y && mouseY <= btn2Y + btnH);
      ctx.save();
      var replayBg = isReplayHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      var replayBorder = isReplayHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      drawRoundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12, replayBg, replayBorder, 1.5);
      ctx.restore();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u21BA Replay', cx, btn2Y + btnH / 2);

      var isMenuHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btn3Y && mouseY <= btn3Y + btnH);
      ctx.save();
      var menuBg = isMenuHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      var menuBorder = isMenuHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      drawRoundRect(cx - btnW / 2, btn3Y, btnW, btnH, 12, menuBg, menuBorder, 1.5);
      ctx.restore();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u{1F3E0} Menu', cx, btn3Y + btnH / 2);
    } else {
      var isReplayHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btnY && mouseY <= btnY + btnH);
      ctx.save();
      var replayBg = isReplayHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      var replayBorder = isReplayHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      drawRoundRect(cx - btnW / 2, btnY, btnW, btnH, 12, replayBg, replayBorder, 1.5);
      ctx.restore();
      ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u21BA Replay', cx, btnY + btnH / 2);

      var isMenuHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btn2Y && mouseY <= btn2Y + btnH);
      ctx.save();
      var menuBg = isMenuHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
      var menuBorder = isMenuHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
      drawRoundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12, menuBg, menuBorder, 1.5);
      ctx.restore();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('\u{1F3E0} Menu', cx, btn2Y + btnH / 2);
    }
  }

  function drawFailedScreen() {
    ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    var animatedScore = Math.min(score, Math.floor(score * (gameOverTime / 1.5)));

    ctx.save();
    ctx.shadowColor = 'rgba(239, 83, 80, 0.25)';
    ctx.shadowBlur = 30;
    drawRoundRect(cx - 140, cy - 140, 280, 280, 24, 'rgba(25, 18, 48, 0.85)', 'rgba(255, 255, 255, 0.08)', 1.5);
    ctx.restore();

    ctx.font = 'bold 26px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#EF5350';
    ctx.fillText('💔 Stage Failed...', cx, cy - 84);

    ctx.font = 'bold 36px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2728 ' + animatedScore, cx, cy - 30);

    ctx.font = '13px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#90A4AE';
    ctx.fillText('Target Score: ' + targetScore, cx, cy + 15);

    var btnW = 200, btnH = 44, btnY = cy + 46;
    var btn2Y = btnY + btnH + 12;

    var isRetryHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btnY && mouseY <= btnY + btnH);
    ctx.save();
    if (isRetryHovered) {
      ctx.shadowColor = 'rgba(239, 83, 80, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 2;
    }
    var retryBg = isRetryHovered ? '#EF9A9A' : '#EF5350';
    var retryBorder = isRetryHovered ? '#FFFFFF' : '#C62828';
    drawRoundRect(cx - btnW / 2, btnY, btnW, btnH, 12, retryBg, retryBorder, 1.5);
    ctx.restore();
    ctx.font = 'bold 16px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u25B6 Retry', cx, btnY + btnH / 2);

    var isMenuHovered = (mouseX >= cx - btnW / 2 && mouseX <= cx + btnW / 2 && mouseY >= btn2Y && mouseY <= btn2Y + btnH);
    ctx.save();
    var menuBg = isMenuHovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
    var menuBorder = isMenuHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.15)';
    drawRoundRect(cx - btnW / 2, btn2Y, btnW, btnH, 12, menuBg, menuBorder, 1.5);
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u{1F3E0} Menu', cx, btn2Y + btnH / 2);
  }

  function drawGameOver() {
    ctx.fillStyle = 'rgba(10, 8, 20, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var cx = canvas.width / 2;
    var cy = canvas.height / 2;

    var animatedScore = Math.min(score, Math.floor(score * (gameOverTime / 1.5)));

    ctx.save();
    ctx.shadowColor = 'rgba(233, 30, 99, 0.25)';
    ctx.shadowBlur = 30;
    drawRoundRect(cx - 140, cy - 140, 280, 280, 24, 'rgba(25, 18, 48, 0.85)', 'rgba(255, 255, 255, 0.08)', 1.5);
    ctx.restore();

    ctx.font = 'bold 30px "Outfit", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FF6B81';
    ctx.fillText("\u23F0 Time's Up!", cx, cy - 84);

    ctx.font = 'bold 36px "Outfit", "Segoe UI", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('\u2728 ' + animatedScore, cx, cy - 30);

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
      ctx.shadowColor = 'rgba(233, 30, 99, 0.4)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 2;
    }
    var retryBg = isRetryHovered ? '#FF8597' : '#FF6B81';
    var retryBorder = isRetryHovered ? '#FFFFFF' : '#E91E63';
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
    if (animState === 'clear' || animState === 'failed' || animState === 'gameover') {
      var cx = canvas.width / 2;
      var cy = canvas.height / 2;
      var btnW = 200, btnH = 44;
      if (animState === 'clear') {
        var hasNext = Match3Levels.getNextLevelId(currentLevelId) !== null;
        var btnY = cy + 46 - (hasNext ? 30 : 0);
        var btn2Y = btnY + btnH + 12;
        var btn3Y = btn2Y + btnH + 12;
        if (p.x >= cx - btnW / 2 && p.x <= cx + btnW / 2) {
          if (hasNext) {
            if (p.y >= btnY && p.y <= btnY + btnH) {
              currentLevelId = Match3Levels.getNextLevelId(currentLevelId);
              resetGame();
              Sound.click();
              return;
            }
            if (p.y >= btn2Y && p.y <= btn2Y + btnH) {
              resetGame();
              Sound.click();
              return;
            }
            if (p.y >= btn3Y && p.y <= btn3Y + btnH) {
              onBack();
              Sound.click();
              return;
            }
          } else {
            if (p.y >= btnY && p.y <= btnY + btnH) {
              resetGame();
              Sound.click();
              return;
            }
            if (p.y >= btn2Y && p.y <= btn2Y + btnH) {
              onBack();
              Sound.click();
              return;
            }
          }
        }
      } else {
        var btnY = cy + 46;
        var btn2Y = btnY + btnH + 12;
        if (p.x >= cx - btnW / 2 && p.x <= cx + btnW / 2) {
          if (p.y >= btnY && p.y <= btnY + btnH) {
            resetGame();
            Sound.click();
            return;
          }
          if (p.y >= btn2Y && p.y <= btn2Y + btnH) {
            onBack();
            Sound.click();
            return;
          }
        }
      }
      return;
    }
    if (p.y < 92) {
      if (p.x < 80) { onBack(); return; }
      return;
    }

    // Check if clicked items slot (Y = 596, H = 38)
    var cx = canvas.width / 2;
    var itemY = 596;
    var itemW = 100;
    var itemH = 38;
    if (p.y >= itemY && p.y <= itemY + itemH && animState === 'idle') {
      var hX = cx - 110;
      var sX = cx + 10;
      if (p.x >= hX && p.x <= hX + itemW) {
        if (itemHammerCount > 0) {
          activeItem = (activeItem === 'hammer') ? null : 'hammer';
          Sound.click();
        } else {
          Sound.invalid();
        }
        return;
      }
      if (p.x >= sX && p.x <= sX + itemW) {
        if (itemShuffleCount > 0) {
          itemShuffleCount--;
          shuffleBoard();
          activeItem = null;
        } else {
          Sound.invalid();
        }
        return;
      }
    }

    if (animState !== 'idle') return;
    var cell = getCell(p.x, p.y);
    if (!cell) { selected = null; return; }

    if (activeItem === 'hammer') {
      useHammer(cell.r, cell.c);
      return;
    }

    if (lockedGems[cell.r][cell.c]) {
      Sound.invalid();
      selected = null;
      return;
    }

    pointerCell = cell;
    swipeStart = { x: p.x, y: p.y, cell: cell };
    selected = cell;
    pointerDown = true;
    hintTimer = 0;
    hintCells = null;
    linkedPath = [cell];
    isLinking = true;
  }

  function useHammer(r, c) {
    if (grid[r][c] < 0) return;
    itemHammerCount--;
    activeItem = null;
    Sound.place();
    var p = cellCenter(r, c);
    var gcIdx = grid[r][c];
    var gc2 = gemColors[gcIdx] || gemColors[0];
    Effects.emit(p.x, p.y, 15, gc2.light, { speedMin: 60, speedMax: 180, sizeMin: 4, sizeMax: 8 });
    Effects.shake(4);
    grid[r][c] = -1;
    specialGems[r][c] = GEM_NORMAL;
    applyGravity();
    startFallAnimation();
  }

  function onUp(e) {
    if (!pointerDown) return;
    pointerDown = false;
    if (animState !== 'idle') return;
    if (!selected) return;

    if (isLinking) {
      if (linkedPath.length >= 3) {
        var lastCell = linkedPath[linkedPath.length - 1];
        var manualSpecial = null;
        if (linkedPath.length === 4) {
          manualSpecial = { r: lastCell.r, c: lastCell.c, type: Math.random() < 0.5 ? GEM_LINE_H : GEM_LINE_V };
        } else if (linkedPath.length === 5) {
          manualSpecial = { r: lastCell.r, c: lastCell.c, type: GEM_BOMB };
        } else if (linkedPath.length >= 6) {
          manualSpecial = { r: lastCell.r, c: lastCell.c, type: GEM_RAINBOW };
        }
        beginRemoval(linkedPath, true, manualSpecial);
        linkedPath = [];
        isLinking = false;
        selected = null;
        swipeStart = null;
        pointerCell = null;
        return;
      }
      linkedPath = [];
      isLinking = false;
    }

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
          if (lockedGems[target.r][target.c] || lockedGems[selected.r][selected.c]) {
            Sound.invalid();
            selected = null;
            swipeStart = null;
            return;
          }
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
            if (lockedGems[a2.r][a2.c] || lockedGems[b2.r][b2.c]) {
              Sound.invalid();
              selected = null;
              swipeStart = null;
              pointerCell = null;
              return;
            }
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
    var p = handlePointer(e.touches ? e.touches[0] : e);
    mouseX = p.x;
    mouseY = p.y;
    if (!pointerDown || !selected) return;

    var cell = getCell(p.x, p.y);
    if (!cell) return;

    if (isLinking) {
      var last = linkedPath[linkedPath.length - 1];
      if (cell.r === last.r && cell.c === last.c) {
        return;
      }

      var dr = Math.abs(cell.r - last.r);
      var dc = Math.abs(cell.c - last.c);
      var is8Adjacent = (dr <= 1 && dc <= 1 && (dr !== 0 || dc !== 0));

      if (is8Adjacent) {
        var startColor = grid[linkedPath[0].r][linkedPath[0].c];
        var targetColor = grid[cell.r][cell.c];

        if (linkedPath.length === 1) {
          if (startColor !== targetColor) {
            isLinking = false;
            pointerCell = cell;
            return;
          }
        }

        if (startColor === targetColor) {
          if (lockedGems[cell.r][cell.c]) {
            return;
          }

          if (linkedPath.length > 1 && cell.r === linkedPath[linkedPath.length - 2].r && cell.c === linkedPath[linkedPath.length - 2].c) {
            linkedPath.pop();
            Sound.click();
            hintTimer = 0;
            return;
          }

          var alreadyInPath = false;
          for (var i = 0; i < linkedPath.length; i++) {
            if (linkedPath[i].r === cell.r && linkedPath[i].c === cell.c) {
              alreadyInPath = true;
              break;
            }
          }

          if (!alreadyInPath) {
            linkedPath.push(cell);
            Sound.linkNode(linkedPath.length - 1);
            hintTimer = 0;
          }
        }
      }
    } else {
      pointerCell = cell;
    }
  }

  function onMouseLeave() {
    mouseX = -1000;
    mouseY = -1000;
  }

  function bindInput() {
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('touchmove', onMove, { passive: false });
  }

  function unbindInput() {
    canvas.removeEventListener('mousedown', onDown);
    canvas.removeEventListener('mouseup', onUp);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('mouseleave', onMouseLeave);
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
    setHighScore: setHighScore,
    isFeverActive: function () { return feverActive; }
  };
})();