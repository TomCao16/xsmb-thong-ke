
"use strict";

/*
 * XSMB THONG KE
 * Algorithm version 2.0.0
 *
 * Quy tac:
 * 1. DB + G1: hai hang, ghep cac vi tri ke nhau ngang/doc/cheo.
 * 2. G3: 6 so, luoi 2 x 3, ghep ngang/doc/cheo trong G3.
 * 3. G5: 6 so, luoi 2 x 3, ghep ngang/doc/cheo trong G5.
 * 4. G5 hang duoi ghep G6 theo cot:
 *    G5 lan 4 <-> G6 lan 1
 *    G5 lan 5 <-> G6 lan 2
 *    G5 lan 6 <-> G6 lan 3
 * 5. G2/G4: chi ghep chu so lien ke trong tung so.
 * 6. Nguong toi thieu: 4 vi tri.
 *
 * Luu y:
 * TEST_DATA la du lieu mau, chua tu dong doc website.
 */

const VERSION = "2.0.0";

const CONFIG = {
  sourceDate: "2026-10-23",
  targetDate: "2026-10-22",
  minPositions: 4
};

/*
 * Du lieu kiem thu.
 * Hay thay cac gia tri nay bang du lieu da xac minh
 * tu ketqua16.net truoc khi dung ket qua thuc te.
 */
const TEST_DATA = {
  "2026-10-23": {
    DB: ["97067"],
    G1: ["19688"],
    G2: ["87440", "68563"],
    G3: [
      "98237", "96450", "34516",
      "92414", "41011", "49196"
    ],
    G4: ["0840", "7322", "9978", "7001"],
    G5: [
      "0664", "1595", "8514",
      "6342", "2372", "0724"
    ],
    G6: ["953", "200", "521"],
    G7: ["70", "16", "53", "03"]
  },

  "2026-10-22": {
    DB: ["25814"],
    G1: ["12613"],
    G2: ["02537", "15905"],
    G3: [
      "19974", "68554", "91512",
      "60166", "90697", "22343"
    ],
    G4: ["9631", "5856", "6546", "2861"],
    G5: [
      "2064", "8820", "1891",
      "7956", "7998", "8415"
    ],
    G6: ["759", "199", "732"],
    G7: ["75", "17", "82", "21"]
  }
};

/* ---------- Chuan hoa du lieu ---------- */

function normalizeNumber(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim().replace(/\s+/g, "");
}

function getNumbers(day, prize) {
  const values = day && day[prize];
  if (!Array.isArray(values)) return [];
  return values.map(normalizeNumber).filter(Boolean);
}

function makeCell(prize, index, value, row, col) {
  return {
    id: `${prize}_${index}`,
    prize,
    index,
    value,
    row,
    col
  };
}

function makeGrid(prize, numbers, columns) {
  return numbers.map((value, index) =>
    makeCell(
      prize,
      index,
      value,
      Math.floor(index / columns),
      index % columns
    )
  );
}

/*
 * Lay cac chu so cua mot o.
 * digitIndex = 0 la chu so dau tien.
 */
function getDigit(cell, digitIndex) {
  if (!cell) return null;
  if (!Number.isInteger(digitIndex)) return null;
  if (digitIndex < 0 || digitIndex >= cell.value.length) return null;
  return cell.value[digitIndex];
}

function getCell(cells, id) {
  return cells.find(cell => cell.id === id) || null;
}

/* ---------- Xac dinh cac vung duoc phep ghep ---------- */

function buildRegions(day) {
  const db = getNumbers(day, "DB");
  const g1 = getNumbers(day, "G1");
  const g2 = getNumbers(day, "G2");
  const g3 = getNumbers(day, "G3");
  const g4 = getNumbers(day, "G4");
  const g5 = getNumbers(day, "G5");
  const g6 = getNumbers(day, "G6");

  const regions = [];

  /*
   * DB/G1: hai hang, moi hang la mot o so.
   * Khong tu y ghep cac chu so khong ke nhau.
   */
  if (db.length >= 1 && g1.length >= 1) {
    regions.push({
      id: "DB_G1",
      type: "grid",
      cells: [
        makeCell("DB", 0, db[0], 0, 0),
        makeCell("G1", 0, g1[0], 1, 0)
      ],
      columns: 1
    });
  }

  /*
   * G3: thu tu 1,2,3 tren hang tren;
   * 4,5,6 tren hang duoi.
   */
  if (g3.length >= 6) {
    regions.push({
      id: "G3",
      type: "grid",
      cells: makeGrid("G3", g3.slice(0, 6), 3),
      columns: 3
    });
  }

  /*
   * G5: hai hang, moi hang 3 so.
   */
  if (g5.length >= 6) {
    regions.push({
      id: "G5",
      type: "grid",
      cells: makeGrid("G5", g5.slice(0, 6), 3),
      columns: 3
    });
  }

  /*
   * G2 va G4: ghep chu so lien ke ben trong tung so.
   */
  for (const prize of ["G2", "G4"]) {
    const numbers = prize === "G2" ? g2 : g4;
    numbers.forEach((value, index) => {
      regions.push({
        id: `${prize}_ADJ_${index}`,
        type: "withinNumber",
        cells: [
          makeCell(prize, index, value, 0, 0)
        ]
      });
    });
  }

  /*
   * G5 hang duoi + G6.
   * Moi cap o tuong ung duoc ghep cac chu so
   * cung chi so, giua hai so.
   */
  if (g5.length >= 6 && g6.length >= 3) {
    for (let col = 0; col < 3; col++) {
      regions.push({
        id: `G5_G6_COL_${col}`,
        type: "pairedCells",
        cells: [
          makeCell("G5", col + 3, g5[col + 3], 0, col),
          makeCell("G6", col, g6[col], 1, col)
        ]
      });
    }
  }

  return regions;
}

/* ---------- Ghép cac vi tri trong mot vung ---------- */

function isAdjacent(a, b) {
  if (!a || !b) return false;

  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);

  return dr <= 1 && dc <= 1 && (dr + dc > 0);
}

function directionOf(a, b) {
  const dr = b.row - a.row;
  const dc = b.col - a.col;

  if (dr === 0 && dc !== 0) return "horizontal";
  if (dc === 0 && dr !== 0) return "vertical";
  if (Math.abs(dr) === Math.abs(dc)) {
    return dr * dc > 0 ? "diagonal-right" : "diagonal-left";
  }

  return "adjacent";
}

function makePosition(cell, digitIndex) {
  return {
    cellId: cell.id,
    prize: cell.prize,
    numberIndex: cell.index,
    number: cell.value,
    row: cell.row,
    col: cell.col,
    digitIndex
  };
}

function makeCreation(region, a, ai, b, bi) {
  const da = getDigit(a, ai);
  const db = getDigit(b, bi);

  if (da === null || db === null) return null;

  return {
    regionId: region.id,
    pair: da + db,
    left: makePosition(a, ai),
    right: makePosition(b, bi),
    direction: directionOf(a, b)
  };
}

/*
 * Ghép cac o ke nhau trong luoi:
 * - Moi cap o chi xet mot lan.
 * - Moi vi tri chu so trong hai o deu duoc xet.
 * - Khong noi sang vung khac.
 */
function createGridPairs(region) {
  const results = [];
  const cells = region.cells;

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];

      if (!isAdjacent(a, b)) continue;

      for (let ai = 0; ai < a.value.length; ai++) {
        for (let bi = 0; bi < b.value.length; bi++) {
          const item = makeCreation(region, a, ai, b, bi);
          if (item) results.push(item);
        }
      }
    }
  }

  return results;
}

/*
 * DB/G1 va G5/G6:
 * chi ghep cac o trong cung cap.
 * Moi chu so cua o tren ghep voi moi chu so o duoi
 * neu hai o co quan he ke nhau trong vung.
 */
function createPairedCellPairs(region) {
  const results = [];
  const [a, b] = region.cells;

  if (!a || !b || !isAdjacent(a, b)) return results;

  for (let ai = 0; ai < a.value.length; ai++) {
    for (let bi = 0; bi < b.value.length; bi++) {
      const item = makeCreation(region, a, ai, b, bi);
      if (item) results.push(item);
    }
  }

  return results;
}

/*
 * G2/G4: cac chu so lien ke trong cung mot so.
 * Vi du 28540 -> 28, 85, 54, 40.
 */
function createWithinNumberPairs(region) {
  const results = [];
  const cell = region.cells[0];

  if (!cell) return results;

  for (let i = 0; i < cell.value.length - 1; i++) {
    results.push({
      regionId: region.id,
      pair: cell.value[i] + cell.value[i + 1],
      left: makePosition(cell, i),
      right: makePosition(cell, i + 1),
      direction: "consecutive-digits"
    });
  }

  return results;
}

function createAllPairs(day) {
  const creations = [];

  for (const region of buildRegions(day)) {
    let items = [];

    if (region.type === "grid") {
      items = createGridPairs(region);
    } else if (region.type === "pairedCells") {
      items = createPairedCellPairs(region);
    } else if (region.type === "withinNumber") {
      items = createWithinNumberPairs(region);
    }

    creations.push(...items);
  }

  return creations;
}

/* ---------- Gom cap dao chieu va dem vi tri ---------- */

function canonicalPair(pair) {
  if (typeof pair !== "string" || pair.length !== 2) return pair;
  const reverse = pair[1] + pair[0];
  return pair <= reverse ? pair : reverse;
}

function groupCreations(creations) {
  const groups = new Map();

  for (const creation of creations) {
    const key = canonicalPair(creation.pair);

    if (!groups.has(key)) {
      groups.set(key, {
        pair: key === creation.pair ? key : `${key[1]}${key[0]}/${key}`,
        canonical: key,
        count: 0,
        positions: []
      });
    }

    const group = groups.get(key);
    group.count += 1;
    group.positions.push(creation);
  }

  return [...groups.values()]
    .filter(group => group.count >= CONFIG.minPositions)
    .sort((a, b) =>
      b.count - a.count || a.canonical.localeCompare(b.canonical)
    );
}

/* ---------- Ap dung dung toa do sang ngay truoc ---------- */

function applyOneCreation(creation, targetDay) {
  const source = creation;
  const regions = buildRegions(targetDay);

  const region = regions.find(r => r.id === source.regionId);
  if (!region) {
    return { ...source, appliedPair: null, status: "MISSING_REGION" };
  }

  const leftCell = getCell(region.cells, source.left.cellId);
  const rightCell = getCell(region.cells, source.right.cellId);

  if (!leftCell || !rightCell) {
    return { ...source, appliedPair: null, status: "MISSING_CELL" };
  }

  const leftDigit = getDigit(leftCell, source.left.digitIndex);
  const rightDigit = getDigit(rightCell, source.right.digitIndex);

  if (leftDigit === null || rightDigit === null) {
    return { ...source, appliedPair: null, status: "MISSING_DIGIT" };
  }

  return {
    ...source,
    appliedPair: leftDigit + rightDigit,
    appliedLeft: makePosition(leftCell, source.left.digitIndex),
    appliedRight: makePosition(rightCell, source.right.digitIndex),
    status: "OK"
  };
}

function applyPatterns(patterns, targetDay) {
  const applied = [];

  for (const group of patterns) {
    for (const creation of group.positions) {
      applied.push({
        sourceCanonical: group.canonical,
        sourcePair: creation.pair,
        ...applyOneCreation(creation, targetDay)
      });
    }
  }

  return applied;
}

/* ---------- Ham chinh de index.html goi ---------- */

function analyze(sourceDay, targetDay) {
  const source = sourceDay || TEST_DATA[CONFIG.sourceDate];
  const target = targetDay || TEST_DATA[CONFIG.targetDate];

  if (!source || !target) {
    throw new Error("Khong tim thay du lieu ngay nguon hoac ngay ap dung.");
  }

  const allSourceCreations = createAllPairs(source);
  const sourceGroups = groupCreations(allSourceCreations);
  const applied = applyPatterns(sourceGroups, target);

  return {
    version: VERSION,
    sourceDate: CONFIG.sourceDate,
    targetDate: CONFIG.targetDate,
    minPositions: CONFIG.minPositions,
    sourceCreationCount: allSourceCreations.length,
    qualifiedPatternCount: sourceGroups.length,
    patterns: sourceGroups,
    applied,
    note:
      "Du lieu hien tai la du lieu thu nghiem. Chua tu dong doc website va chua doi chieu ket qua thuc te."
  };
}

/* ---------- Ho tro chay trong trinh duyet va Node.js ---------- */

if (typeof window !== "undefined") {
  window.XSMBAlgorithm = {
    VERSION,
    CONFIG,
    TEST_DATA,
    buildRegions,
    createAllPairs,
    groupCreations,
    applyPatterns,
    analyze
  };

  window.analyze = analyze;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VERSION,
    CONFIG,
    TEST_DATA,
    buildRegions,
    createAllPairs,
    groupCreations,
    applyPatterns,
    analyze
  };
}
