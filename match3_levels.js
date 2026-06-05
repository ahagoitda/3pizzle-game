var Match3Levels = (function() {
  'use strict';

  var levels = [
    // World 1: Sweet Forest
    { id: '1-1', world: 1, target: 800, time: 60, colors: 4, name: 'Forest Path 🌸' },
    { id: '1-2', world: 1, target: 1800, time: 60, colors: 4, name: 'Fruit Orchard 🍓' },
    { id: '1-3', world: 1, target: 2800, time: 50, colors: 5, name: 'Breezy Woods 🍃' },
    { id: '1-4', world: 1, target: 4000, time: 45, colors: 5, name: 'Deep Thicket 🌲' },
    { id: '1-5', world: 1, target: 5500, time: 40, colors: 6, name: 'Elven Sanctuary ✨' },

    // World 2: Neon Cave
    { id: '2-1', world: 2, target: 6500, time: 60, colors: 5, name: 'Cave Mouth 🕳️' },
    { id: '2-2', world: 2, target: 8000, time: 55, colors: 5, name: 'Glowing Crystals 💎' },
    { id: '2-3', world: 2, target: 10000, time: 50, colors: 6, name: 'Echoing Chasm 🔊' },
    { id: '2-4', world: 2, target: 12000, time: 45, colors: 6, name: 'Subterranean River 🌊' },
    { id: '2-5', world: 2, target: 15000, time: 40, colors: 6, name: 'Neon Heart 🌟' }
  ];

  function getUnlockedLevel() {
    try {
      var val = localStorage.getItem('triplePuzzleMatch3Level');
      if (val) return val;
    } catch (e) {}
    return '1-1';
  }

  function setUnlockedLevel(lvlId) {
    try {
      var currentUnlocked = getUnlockedLevel();
      var currentIdx = getLevelIndex(currentUnlocked);
      var newIdx = getLevelIndex(lvlId);
      if (newIdx > currentIdx) {
        localStorage.setItem('triplePuzzleMatch3Level', lvlId);
      }
    } catch (e) {}
  }

  function getLevelIndex(lvlId) {
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].id === lvlId) return i;
    }
    return 0;
  }

  function getLevel(lvlId) {
    for (var i = 0; i < levels.length; i++) {
      if (levels[i].id === lvlId) return levels[i];
    }
    return levels[0];
  }

  function getNextLevelId(lvlId) {
    var idx = getLevelIndex(lvlId);
    if (idx + 1 < levels.length) {
      return levels[idx + 1].id;
    }
    return null;
  }

  return {
    levels: levels,
    getUnlockedLevel: getUnlockedLevel,
    setUnlockedLevel: setUnlockedLevel,
    getLevel: getLevel,
    getNextLevelId: getNextLevelId,
    getLevelIndex: getLevelIndex
  };
})();
