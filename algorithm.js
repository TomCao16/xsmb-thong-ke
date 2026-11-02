
"use strict";

/*
 * XSMB THONG KE
 * Algorithm version 4.1.0
 *
 * Quy trinh:
 * 1. Tim mau tren ngay N.
 * 2. Chi giu cap co it nhat 6 toa do khac nhau.
 * 3. Chuyen nguyen toa do sang ngay N-1.
 * 4. Tao cap moi bang chu so ngay N-1.
 * 5. Doi chieu voi duoi DB den G7 ngay N.
 * 6. Nhom ket qua khop theo cap mau ngay N.
 *
 * Khong co TEST_DATA, khong tu tao du lieu thay the.
 */

(function (root) {
  "use strict";

  const VERSION = "4.1.0";

  const CONFIG = Object.freeze({
    minPositions: 6,
    expectedCounts: {
      DB: 1, G1: 1, G2: 2, G3: 6,
      G4: 4, G5: 6, G6: 3, G7: 4
    },
    expectedLengths: {
      DB: 5, G1: 5, G2: 5, G3: 5,
      G4: 4, G5: 4, G6: 3, G7: 2
    }
  });

  const RESULT_PRIZES = [
    "DB", "G1", "G2", "G3",
    "G4", "G5", "G6", "G7"
  ];

  const REGION_CONFIG = [
    {
      id: "RED_DB_G1",
      type: "red",
      cells: [
        { prize: "DB", index: 0 },
        { prize: "G1", index: 0 }
      ]
    },
    {
      id: "RED_G3_LEFT",
      type: "red",
      cells: [
        { prize: "G3", index: 0 },
        { prize: "G3", index: 3 }
      ]
    },
    {
      id: "RED_G3_CENTER",
      type: "red",
      cells: [
        { prize: "G3", index: 1 },
        { prize: "G3", index: 4 }
      ]
    },
    {
      id: "RED_G3_RIGHT",
      type: "red",
      cells: [
        { prize: "G3", index: 2 },
        { prize: "G3", index: 5 }
      ]
    },
    {
      id: "RED_G5_LEFT",
      type: "red",
      cells: [
        { prize: "G5", index: 0 },
        { prize: "G5", index: 3 },
        { prize: "G6", index: 0 }
      ]
    },
    {
      id: "RED_G5_CENTER",
      type: "red",
      cells: [
        { prize: "G5", index: 1 },
        { prize: "G5", index: 4 },
        { prize: "G6", index: 1 }
      ]
    },
    {
      id: "RED_G5_RIGHT",
      type: "red",
      cells: [
        { prize: "G5", index: 2 },
        { prize: "G5", index: 5 },
        { prize: "G6", index: 2 }
      ]
    },
    {
      id: "BLACK_G2_1",
      type: "black",
      cells: [{ prize: "G2", index: 0 }]
    },
    {
      id: "BLACK_G2_2",
      type: "black",
      cells: [{ prize: "G2", index: 1 }]
    },
    {
      id: "BLACK_G4_1",
      type: "black",
      cells: [{ prize: "G4", index: 0 }]
    },
    {
      id: "BLACK_G4_2",
      type: "black",
      cells: [{ prize: "G4", index: 1 }]
    },
    {
      id: "BLACK_G4_3",
      type: "black",
      cells: [{ prize: "G4", index: 2 }]
    },
    {
      id: "BLACK_G4_4",
      type: "black",
      cells: [{ prize: "G4", index: 3 }]
    }
  ];

  function normalizeNumber(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim().replace(/\s+/g, "");
  }

  function getNumbers(day, prize) {
    const values = day && day[prize];
    if (!Array.isArray(values)) return [];
    return values.map(normalizeNumber);
  }

  function getNumber(day, prize, index) {
    return getNumbers(day, prize)[index] || "";
  }

  function getCellId(prize, index) {
    return `${prize}_${index}`;
  }

  function getCellValue(day, cell) {
    return getNumber(day, cell.prize, cell.index);
  }

  function getDigit(day, position) {
    const number = getNumber(
      day,
      position.prize,
      position.numberIndex
    );

    if (
      !number ||
      !Number.isInteger(position.digitIndex) ||
      position.digitIndex < 0 ||
      position.digitIndex >= number.length
    ) {
      return null;
    }

    return number[position.digitIndex];
  }

  function makePosition(day, cell, digitIndex) {
    const number = getCellValue(day, cell);

    if (!number || digitIndex < 0 || digitIndex >= number.length) {
      return null;
    }

    return {
      cellId: getCellId(cell.prize, cell.index),
      prize: cell.prize,
      numberIndex: cell.index,
      number,
      digitIndex
    };
  }

  function validateDay(day, label) {
    if (!day || typeof day !== "object") {
      throw new Error(`Dữ liệu ${label} không hợp lệ.`);
    }

    if (!day.date || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
      throw new Error(`Dữ liệu ${label} thiếu ngày hợp lệ.`);
    }

    const errors = [];

    for (const prize of RESULT_PRIZES) {
      const values = day[prize];
      const expectedCount = CONFIG.expectedCounts[prize];
      const expectedLength = CONFIG.expectedLengths[prize];

      if (!Array.isArray(values)) {
        errors.push(`${prize}: không có mảng kết quả`);
        continue;
      }

      if (values.length !== expectedCount) {
        errors.push(
          `${prize}: cần ${expectedCount} kết quả, nhận ${values.length}`
        );
        continue;
      }

      values.forEach((raw, index) => {
        const value = normalizeNumber(raw);

        if (!new RegExp(`^\\d{${expectedLength}}$`).test(value)) {
          errors.push(
            `${prize} kết quả ${index + 1}: sai định dạng ${expectedLength} chữ số`
          );
        }
      });
    }

    if (errors.length) {
      throw new Error(
        `Dữ liệu ${label} không đầy đủ hoặc sai định dạng: ` +
        errors.join("; ")
      );
    }

    return true;
  }

  function validateRegions(regions) {
    if (!Array.isArray(regions)) {
      throw new Error("Cấu hình vùng ghép không hợp lệ.");
    }

    const ids = new Set();

    for (const region of regions) {
      if (!region || !region.id || ids.has(region.id)) {
        throw new Error("Vùng ghép thiếu ID hoặc bị trùng ID.");
      }

      ids.add(region.id);

      if (!["red", "black"].includes(region.type)) {
        throw new Error(`Loại vùng không hợp lệ: ${region.id}`);
      }

      if (!Array.isArray(region.cells) || !region.cells.length) {
        throw new Error(`Vùng ${region.id} không có ô số.`);
      }

      for (const cell of region.cells) {
        if (
          !RESULT_PRIZES.includes(cell.prize) ||
          !Number.isInteger(cell.index) ||
          cell.index < 0 ||
          cell.index >= CONFIG.expectedCounts[cell.prize]
        ) {
          throw new Error(`Tọa độ cấu hình không hợp lệ tại ${region.id}.`);
        }
      }
    }
  }

  // Vung do: moi cap vi tri chu so khac nhau trong cung mot vung.
  function createRedPairs(day, region) {
    const positions = [];

    for (const cell of region.cells) {
      const number = getCellValue(day, cell);

      for (let digitIndex = 0; digitIndex < number.length; digitIndex++) {
        const position = makePosition(day, cell, digitIndex);
        if (position) positions.push(position);
      }
    }

    const creations = [];

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const left = positions[i];
        const right = positions[j];
        const leftDigit = getDigit(day, left);
        const rightDigit = getDigit(day, right);

        if (leftDigit === null || rightDigit === null) continue;

        creations.push({
          regionId: region.id,
          regionType: "red",
          pair: leftDigit + rightDigit,
          left,
          right,
          direction: "all-combinations"
        });
      }
    }

    return creations;
  }

  // Vung den: chi ghep hai chu so lien ke trong tung so.
  function createBlackPairs(day, region) {
    const creations = [];

    for (const cell of region.cells) {
      const number = getCellValue(day, cell);

      for (let i = 0; i < number.length - 1; i++) {
        const left = makePosition(day, cell, i);
        const right = makePosition(day, cell, i + 1);

        if (!left || !right) continue;

        creations.push({
          regionId: region.id,
          regionType: "black",
          pair: number[i] + number[i + 1],
          left,
          right,
          direction: "adjacent-digits"
        });
      }
    }

    return creations;
  }

  function createAllPairs(day, regions = REGION_CONFIG) {
    validateRegions(regions);

    const creations = [];

    for (const region of regions) {
      if (region.type === "red") {
        creations.push(...createRedPairs(day, region));
      } else {
        creations.push(...createBlackPairs(day, region));
      }
    }

    return creations;
  }

  function canonicalPair(pair) {
    if (typeof pair !== "string" || !/^\d{2}$/.test(pair)) {
      return pair;
    }

    const reverse = pair[1] + pair[0];
    return pair <= reverse ? pair : reverse;
  }

  function positionSignature(creation) {
    return [
      creation.regionId,
      creation.left.cellId,
      creation.left.digitIndex,
      creation.right.cellId,
      creation.right.digitIndex
    ].join("|");
  }

  // Gom cap dao chieu, dem moi bo toa do duy nhat mot lan.
  function groupCreations(creations, minPositions = CONFIG.minPositions) {
    const groups = new Map();

    for (const creation of creations) {
      const key = canonicalPair(creation.pair);

      if (!groups.has(key)) {
        groups.set(key, {
          canonical: key,
          positions: [],
          signatures: new Set()
        });
      }

      const group = groups.get(key);
      const signature = positionSignature(creation);

      if (group.signatures.has(signature)) continue;

      group.signatures.add(signature);
      group.positions.push({
        ...creation,
        sourcePair: creation.pair,
        sourceCanonical: key
      });
    }

    return Array.from(groups.values())
      .filter(group => group.positions.length >= minPositions)
      .map(group => ({
        pair: group.canonical,
        canonical: group.canonical,
        reverse: group.canonical[1] + group.canonical[0],
        count: group.positions.length,
        positions: group.positions
      }))
      .sort((a, b) =>
        b.count - a.count ||
        a.canonical.localeCompare(b.canonical)
      );
  }

  // Ap dung dung toa do ngay N sang ngay N-1.
  function applyOneCreation(creation, previousDay) {
    const leftDigit = getDigit(previousDay, creation.left);
    const rightDigit = getDigit(previousDay, creation.right);

    if (leftDigit === null || rightDigit === null) {
      return {
        ...creation,
        appliedPair: null,
        status: "INVALID_POSITION"
      };
    }

    const appliedLeftNumber = getNumber(
      previousDay,
      creation.left.prize,
      creation.left.numberIndex
    );

    const appliedRightNumber = getNumber(
      previousDay,
      creation.right.prize,
      creation.right.numberIndex
    );

    const appliedPair = leftDigit + rightDigit;

    return {
      ...creation,
      appliedPair,
      appliedCanonical: canonicalPair(appliedPair),
      appliedLeft: {
        ...creation.left,
        number: appliedLeftNumber
      },
      appliedRight: {
        ...creation.right,
        number: appliedRightNumber
      },
      status: "OK"
    };
  }

  function applyPatterns(patterns, previousDay) {
    const applied = [];

    for (const group of patterns) {
      for (const creation of group.positions) {
        const result = applyOneCreation(creation, previousDay);

        applied.push({
          sourceCanonical: group.canonical,
          sourcePair: creation.sourcePair,
          ...result
        });
      }
    }

    return applied;
  }

  function collectActualTails(sourceDay) {
    const tails = [];

    for (const prize of RESULT_PRIZES) {
      getNumbers(sourceDay, prize).forEach((number, index) => {
        tails.push({
          prize,
          numberIndex: index,
          number,
          tail: number.slice(-2)
        });
      });
    }

    return tails;
  }

  /*
   * DOI CHIEU VA NHOM THEO CAP MAU NGAY N.
   *
   * Moi item trong matched la mot vi tri cua mau N
   * da tao ra mot cap tren N-1 va cap do khop ket qua N.
   *
   * matchedGroups:
   * - sourcePair: cap mau ngay N (gom cap dao chieu).
   * - totalPositions: tong vi tri cua mau tren N.
   * - appliedPositions: so vi tri da tao cap tren N-1.
   * - matchedPositions: so vi tri tao cap khop ket qua N.
   * - positions: chi tiet cac vi tri khop.
   * - matchedResults: cac ket qua thuc te ngay N khop.
   */
  function matchActualResults(applied, sourceDay) {
    const actualTails = collectActualTails(sourceDay);
    const matched = [];
    const groups = new Map();

    for (const item of applied) {
      if (item.status !== "OK" || !item.appliedPair) continue;

      const pair = item.appliedPair;
      const reverse = pair[1] + pair[0];

      const hits = actualTails.filter(result =>
        result.tail === pair || result.tail === reverse
      );

      if (!hits.length) continue;

      const matchedItem = {
        ...item,
        matchedResults: hits
      };

      matched.push(matchedItem);

      // Nhom theo cap mau ngay N, khong nhom theo cap N-1.
      const key = item.sourceCanonical;

      if (!groups.has(key)) {
        groups.set(key, {
          pair: key,
          canonical: key,
          positions: [],
          matchedResults: [],
          totalPositions: 0,
          appliedPositions: 0
        });
      }

      const group = groups.get(key);

      group.positions.push(matchedItem);
      group.matchedResults.push(...hits);
    }

    // Lay tong so vi tri mau va so vi tri ap dung tu toan bo applied.
    const patternTotals = new Map();

    for (const item of applied) {
      const key = item.sourceCanonical;

      if (!patternTotals.has(key)) {
        patternTotals.set(key, {
          totalPositions: 0,
          appliedPositions: 0
        });
      }

      const totals = patternTotals.get(key);
      totals.totalPositions += 1;

      if (item.status === "OK" && item.appliedPair) {
        totals.appliedPositions += 1;
      }
    }

const matchedGroups = Array.from(groups.values())
  .map(group => {
    const uniqueResults = [];
    const seenResults = new Set();

    for (const result of group.matchedResults) {
      const signature = [
        result.prize,
        result.numberIndex,
        result.number,
        result.tail
      ].join("|");

      if (seenResults.has(signature)) continue;

      seenResults.add(signature);
      uniqueResults.push(result);
    }

    const totals = patternTotals.get(group.canonical) || {
      totalPositions: 0,
      appliedPositions: 0
    };

    return {
      pair: group.pair,
      canonical: group.canonical,
      totalPositions: totals.totalPositions,
      appliedPositions: totals.appliedPositions,
      matchedPositions: group.positions.length,
      positions: group.positions,
      matchedResults: uniqueResults
    };
  })
  // Chi hien thi cap mau co tu 4 vi tri khop tro len.
  .filter(group => group.matchedPositions >= 4)
  .sort((a, b) => a.canonical.localeCompare(b.canonical));

    return {
      matched,
      matchedGroups
    };
  }

  function analyze(sourceDay, previousDay, options = {}) {
    if (!sourceDay || !previousDay) {
      throw new Error("Thiếu dữ liệu ngày N hoặc ngày N−1.");
    }

    const minPositions = options.minPositions === undefined
      ? CONFIG.minPositions
      : Number(options.minPositions);

    if (!Number.isInteger(minPositions) || minPositions < 1) {
      throw new Error("Ngưỡng số vị trí phải là số nguyên dương.");
    }

    if (!sourceDay.date || !previousDay.date) {
      throw new Error("Dữ liệu Worker thiếu ngày của một trong hai ngày.");
    }

    validateDay(sourceDay, "ngày N");
    validateDay(previousDay, "ngày N−1");
    validateRegions(options.regions || REGION_CONFIG);

    const expectedPrevious = new Date(`${sourceDay.date}T00:00:00`);
    expectedPrevious.setDate(expectedPrevious.getDate() - 1);

    const expectedPreviousDate = [
      expectedPrevious.getFullYear(),
      String(expectedPrevious.getMonth() + 1).padStart(2, "0"),
      String(expectedPrevious.getDate()).padStart(2, "0")
    ].join("-");

    if (previousDay.date !== expectedPreviousDate) {
      throw new Error(
        `Ngày N−1 không đúng. Cần ${expectedPreviousDate}, ` +
        `nhưng Worker trả về ${previousDay.date}.`
      );
    }

    const regions = options.regions || REGION_CONFIG;

    // Buoc 1: Tim mau tren ngay N.
    const sourceCreations = createAllPairs(sourceDay, regions);

    // Buoc 2: Loc mau theo nguong toi thieu.
    const patterns = groupCreations(sourceCreations, minPositions);

    // Buoc 3: Chuyen toa do mau sang ngay N-1.
    const applied = applyPatterns(patterns, previousDay);

    // Buoc 4: Doi chieu va nhom theo cap mau ngay N.
    const comparison = matchActualResults(applied, sourceDay);

    const validApplied = applied.filter(item => item.status === "OK");

    return {
      version: VERSION,
      sourceDate: sourceDay.date,
      targetDate: previousDay.date,
      comparisonDate: sourceDay.date,
      minPositions,
      regionCount: regions.length,
      sourceCreationCount: sourceCreations.length,
      qualifiedPatternCount: patterns.length,
      appliedPositionCount: applied.length,
      validAppliedPositionCount: validApplied.length,
      matchedPositionCount: comparison.matched.length,
      matchedPairGroupCount: comparison.matchedGroups.length,
      patterns,
      applied,
      matched: comparison.matched,
      matchedGroups: comparison.matchedGroups,
      summary: {
        sourceCreations: sourceCreations.length,
        qualifiedPatterns: patterns.length,
        appliedPositions: applied.length,
        validAppliedPositions: validApplied.length,
        matchedPositions: comparison.matched.length,
        matchedPairGroups: comparison.matchedGroups.length
      },
      note:
        "Mẫu được tìm trên ngày N; giữ nguyên tọa độ để áp dụng sang ngày N−1; " +
        "cặp tạo trên N−1 được đối chiếu với đuôi DB đến G7 của ngày N. " +
        "Phần C nhóm theo cặp mẫu ngày N và đếm số vị trí tạo cặp khớp."
    };
  }

  const API = {
    VERSION,
    CONFIG,
    REGION_CONFIG,
    normalizeNumber,
    getNumbers,
    validateDay,
    validateRegions,
    createRedPairs,
    createBlackPairs,
    createAllPairs,
    canonicalPair,
    groupCreations,
    applyOneCreation,
    applyPatterns,
    collectActualTails,
    matchActualResults,
    analyze
  };

  if (typeof window !== "undefined") {
    window.XSMBAlgorithm = API;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

})(typeof globalThis !== "undefined" ? globalThis : this);
