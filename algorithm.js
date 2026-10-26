
"use strict";

/*
 * XSMB THONG KE
 * Version 1.0.0
 *
 * Test harness for the position-based algorithm.
 * No external libraries required.
 */

const CONFIG = {
  sourceDate: "2026-10-23",
  targetDate: "2026-10-22",
  minPositions: 4
};

// Temporary test fixtures.
// Replace these with verified source data before production use.
const TEST_DATA = {
  "2026-10-23": [
    ["97067"],
    ["19688"],
    ["87440", "68563"],
    ["98237", "96450", "34516"],
    ["92414", "41011", "49196"],
    ["0840", "7322", "9978", "7001"],
    ["0664", "1595", "8514"],
    ["6342", "2372", "0724"],
    ["953", "200", "521"],
    ["70", "16", "53", "03"]
  ],
  "2026-10-22": [
    ["25814"],
    ["12613"],
    ["02537", "15905"],
    ["19974", "68554", "91512"],
    ["60166", "90697", "22343"],
    ["9631", "5856", "6546", "2861"],
    ["2064", "8820", "1891"],
    ["7956", "7998", "8415"],
    ["759", "199", "732"],
    ["75", "17", "82", "21"]
  ]
};

const ROW_NAMES = [
  "DB", "G1", "G2", "G3", "G3",
  "G4", "G5", "G5", "G6", "G7"
];

function buildCells(rows) {
  if (!Array.isArray(rows) || rows.length !== ROW_NAMES.length) {
    throw new Error("Invalid table row count.");
  }

  const cells = [];

  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      value = String(value);

      if (!/^\d+$/.test(value)) {
        throw new Error(`Invalid number at row ${r}, col ${c}`);
      }

      cells.push({
        id: `${ROW_NAMES[r]}_R${r}_C${c}`,
        row: r,
        col: c,
        width: row.length,
        prize: ROW_NAMES[r],
        value
      });
    });
  });

  return cells;
}

function areAdjacent(a, b) {
  const dr = Math.abs(a.row - b.row);

  if (dr > 1) return false;

  if (dr === 0) {
    return Math.abs(a.col - b.col) === 1;
  }

  // Normalize horizontal cell centers across rows
  // that have different numbers of cells.
  const ax = (a.col + 0.5) / a.width;
  const bx = (b.col + 0.5) / b.width;

  return Math.abs(ax - bx) <=
    0.5 / a.width + 0.5 / b.width + 1e-9;
}

function directionOf(a, b) {
  if (a.row === b.row) return "horizontal";

  const ax = (a.col + 0.5) / a.width;
  const bx = (b.col + 0.5) / b.width;

  if (Math.abs(ax - bx) < 1e-9) return "vertical";

  return bx < ax ? "diagonal-left" : "diagonal-right";
}

function canonicalPair(pair) {
  const reverse = pair[1] + pair[0];
  return pair <= reverse ? pair : reverse;
}

function findPatterns(rows, minPositions = 4) {
  const cells = buildCells(rows);
  const patterns = new Map();

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];

      if (!areAdjacent(a, b)) continue;

      const length = Math.min(a.value.length, b.value.length);

      for (let d = 0; d < length; d++) {
        const pair = a.value[d] + b.value[d];
        const key = canonicalPair(pair);

        if (!patterns.has(key)) {
          patterns.set(key, new Map());
        }

        const position = {
          cellA: a.id,
          cellB: b.id,
          prizeA: a.prize,
          prizeB: b.prize,
          valueA: a.value,
          valueB: b.value,
          digitIndex: d,
          direction: directionOf(a, b),
          pair
        };

        const positionKey =
          `${position.cellA}|${position.cellB}|${d}`;

        patterns.get(key).set(positionKey, position);
      }
    }
  }

  return [...patterns.entries()]
    .map(([pair, positions]) => ({
      pair,
      reversePair: pair[1] + pair[0],
      positions: [...positions.values()],
      positionCount: positions.size
    }))
    .filter(item => item.positionCount >= minPositions)
    .sort((a, b) =>
      b.positionCount - a.positionCount ||
      a.pair.localeCompare(b.pair)
    );
}

function applyPatterns(patterns, targetRows) {
  const cells = buildCells(targetRows);
  const cellMap = new Map(cells.map(cell => [cell.id, cell]));

  return patterns.map(pattern => {
    const results = [];

    for (const p of pattern.positions) {
      const a = cellMap.get(p.cellA);
      const b = cellMap.get(p.cellB);

      if (!a || !b) {
        results.push({
          ...p,
          applied: false,
          error: "Coordinate missing on target day"
        });
        continue;
      }

      if (
        p.digitIndex >= a.value.length ||
        p.digitIndex >= b.value.length
      ) {
        results.push({
          ...p,
          applied: false,
          error: "Digit index unavailable"
        });
        continue;
      }

      const pair = a.value[p.digitIndex] + b.value[p.digitIndex];

      results.push({
        sourcePair: pattern.pair,
        pair,
        reversePair: pair[1] + pair[0],
        cellA: p.cellA,
        cellB: p.cellB,
        digitIndex: p.digitIndex,
        direction: p.direction,
        valueA: a.value,
        valueB: b.value,
        applied: true
      });
    }

    return {
      sourcePair: pattern.pair,
      sourcePositionCount: pattern.positionCount,
      results
    };
  });
}

function analyze(data = TEST_DATA, config = CONFIG) {
  const sourceRows = data[config.sourceDate];
  const targetRows = data[config.targetDate];

  if (!sourceRows || !targetRows) {
    throw new Error("Source date or target date is missing.");
  }

  const sourcePatterns = findPatterns(
    sourceRows,
    config.minPositions
  );

  const appliedPatterns = applyPatterns(
    sourcePatterns,
    targetRows
  );

  return {
    version: "1.0.0",
    sourceDate: config.sourceDate,
    targetDate: config.targetDate,
    minPositions: config.minPositions,
    sourcePatternCount: sourcePatterns.length,
    sourcePatterns,
    appliedPatterns
  };
}

// Export for use in a browser or Node.js.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONFIG,
    TEST_DATA,
    buildCells,
    findPatterns,
    applyPatterns,
    analyze
  };
}
