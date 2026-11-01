
"use strict";

/*
 * XSMB THONG KE
 * Algorithm version 3.0.0
 *
 * QUY TRINH:
 * 1. Ngay N: Tao mau trong cac vung do va den da khai bao.
 * 2. Loc cap co toi thieu 5 luot tao thanh.
 * 3. Ngay N-1: Ap dung dung cac toa do mau cua ngay N.
 * 4. Ngay N: Lay duoi 2 so DB -> G7 de doi chieu.
 * 5. Chi giu cac cap tao tren N-1 co mat trong ket qua ngay N.
 *
 * VUNG DO:
 * Ghep moi hai vi tri chu so khac nhau trong cung vung.
 *
 * VUNG DEN:
 * Chi ghep hai chu so lien ke ben trong tung so.
 *
 * KHONG GHEP:
 * Khong ghep giua hai vung khac nhau.
 * Khong tu dong mo rong vung.
 */

(function (root) {
  "use strict";

  const VERSION = "3.0.0";

  const CONFIG = {
    sourceDate: "2026-10-23",
    targetDate: "2026-10-22",
    minPositions: 5
  };

  /*
   * DU LIEU KIEM THU CU.
   * Chua phai du lieu da xac minh tu website.
   * Khi su dung du lieu thuc te, truyen sourceDay va
   * previousDay vao analyze().
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

  // =====================================================
  // 1. KHAI BAO CAC VUNG DUOC PHEP GHEP
  // =====================================================

  /*
   * index bat dau tu 0:
   *
   * G3:
   * 0, 1, 2 = hang tren
   * 3, 4, 5 = hang duoi
   *
   * G5:
   * 0, 1, 2 = hang tren
   * 3, 4, 5 = hang duoi
   *
   * G6:
   * 0, 1, 2 = ba so tu trai sang phai
   *
   * DB va G1 moi giai co mot so.
   */

  const REGION_CONFIG = [
    // ---------------- VUNG DO DB + G1 ----------------
    {
      id: "RED_DB_G1",
      type: "red",
      cells: [
        { prize: "DB", index: 0 },
        { prize: "G1", index: 0 }
      ]
    },

    // ---------------- VUNG DO G3 ----------------
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

    // ---------------- VUNG DO G5 + G6 ----------------
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

    // ---------------- VUNG DEN G2 ----------------
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

    // ---------------- VUNG DEN G4 ----------------
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

  // =====================================================
  // 2. CHUAN HOA VA DOC DU LIEU
  // =====================================================

  function normalizeNumber(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).trim().replace(/\s+/g, "");
  }

  function getNumbers(day, prize) {
    const values = day && day[prize];

    if (!Array.isArray(values)) {
      return [];
    }

    return values.map(normalizeNumber);
  }

  function getNumber(day, prize, index) {
    const numbers = getNumbers(day, prize);
    return numbers[index] || "";
  }

  function getCellId(prize, index) {
    return `${prize}_${index}`;
  }

  function getCellValue(day, cellConfig) {
    return getNumber(
      day,
      cellConfig.prize,
      cellConfig.index
    );
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

  function makePosition(day, cellConfig, digitIndex) {
    const number = getCellValue(day, cellConfig);

    if (
      !number ||
      digitIndex < 0 ||
      digitIndex >= number.length
    ) {
      return null;
    }

    return {
      cellId: getCellId(
        cellConfig.prize,
        cellConfig.index
      ),
      prize: cellConfig.prize,
      numberIndex: cellConfig.index,
      number: number,
      digitIndex: digitIndex
    };
  }

  // =====================================================
  // 3. KIEM TRA CAU TRUC DU LIEU VA VUNG
  // =====================================================

  function validateDay(day, label) {
    if (!day || typeof day !== "object") {
      throw new Error(`Du lieu ${label} khong hop le.`);
    }

    const requiredPrizes = [
      "DB", "G1", "G2", "G3",
      "G4", "G5", "G6", "G7"
    ];

    const errors = [];

    for (const prize of requiredPrizes) {
      if (!Array.isArray(day[prize])) {
        errors.push(`Thieu mang ket qua ${prize}.`);
      }
    }

    if (errors.length) {
      throw new Error(
        `Du lieu ${label} khong day du: ` +
        errors.join(" ")
      );
    }
  }

  function validateRegions(regions) {
    const ids = new Set();

    for (const region of regions) {
      if (!region || !region.id) {
        throw new Error("Vung ghep thieu id.");
      }

      if (ids.has(region.id)) {
        throw new Error(
          `Trung ma vung: ${region.id}`
        );
      }

      ids.add(region.id);

      if (
        region.type !== "red" &&
        region.type !== "black"
      ) {
        throw new Error(
          `Loai vung khong hop le: ${region.id}`
        );
      }

      if (!Array.isArray(region.cells) ||
          region.cells.length === 0) {
        throw new Error(
          `Vung ${region.id} khong co o so.`
        );
      }
    }
  }

  // =====================================================
  // 4. TAO CAP TRONG VUNG DO
  // =====================================================

  /*
   * Vung do:
   * Lay tat ca vi tri chu so trong cung mot vung.
   * Moi hai vi tri khac nhau tao thanh mot cap.
   *
   * Khong ghep sang vung khac.
   * Khong gioi han phai lien ke.
   */

  function createRedPairs(day, region) {
    const positions = [];

    for (const cellConfig of region.cells) {
      const number = getCellValue(day, cellConfig);

      for (let digitIndex = 0;
           digitIndex < number.length;
           digitIndex++) {

        const position = makePosition(
          day,
          cellConfig,
          digitIndex
        );

        if (position) {
          positions.push(position);
        }
      }
    }

    const creations = [];

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const left = positions[i];
        const right = positions[j];

        const leftDigit = getDigit(day, left);
        const rightDigit = getDigit(day, right);

        if (
          leftDigit === null ||
          rightDigit === null
        ) {
          continue;
        }

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

  // =====================================================
  // 5. TAO CAP TRONG VUNG DEN
  // =====================================================

  /*
   * Vung den:
   * Moi so duoc xu ly rieng.
   * Chi ghep digit i voi digit i+1.
   * Khong ghep giua hai so.
   */

  function createBlackPairs(day, region) {
    const creations = [];

    for (const cellConfig of region.cells) {
      const number = getCellValue(day, cellConfig);

      for (let i = 0; i < number.length - 1; i++) {
        const left = makePosition(
          day,
          cellConfig,
          i
        );

        const right = makePosition(
          day,
          cellConfig,
          i + 1
        );

        if (!left || !right) {
          continue;
        }

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

  // =====================================================
  // 6. TAO TAT CA CAP THEO CAC VUNG DA KHAI BAO
  // =====================================================

  function createAllPairs(day, regions = REGION_CONFIG) {
    validateRegions(regions);

    const creations = [];

    for (const region of regions) {
      let items = [];

      if (region.type === "red") {
        items = createRedPairs(day, region);
      }

      if (region.type === "black") {
        items = createBlackPairs(day, region);
      }

      creations.push(...items);
    }

    return creations;
  }

  // =====================================================
  // 7. GOP CAP DAO CHIEU
  // =====================================================

  function canonicalPair(pair) {
    if (
      typeof pair !== "string" ||
      pair.length !== 2
    ) {
      return pair;
    }

    const reverse = pair[1] + pair[0];

    return pair <= reverse ? pair : reverse;
  }

  function positionSignature(creation) {
    const left = creation.left;
    const right = creation.right;

    return [
      creation.regionId,
      left.cellId,
      left.digitIndex,
      right.cellId,
      right.digitIndex
    ].join("|");
  }

  // =====================================================
  // 8. LOC MAU CO IT NHAT 5 LUOT TAO THANH
  // =====================================================

  function groupCreations(
    creations,
    minPositions = CONFIG.minPositions
  ) {
    const groups = new Map();

    for (const creation of creations) {
      const key = canonicalPair(creation.pair);

      if (!groups.has(key)) {
        groups.set(key, {
          canonical: key,
          count: 0,
          positions: [],
          signatures: new Set()
        });
      }

      const group = groups.get(key);
      const signature = positionSignature(creation);

      // Moi cap toa do chi duoc dem mot lan.
      if (group.signatures.has(signature)) {
        continue;
      }

      group.signatures.add(signature);
      group.count++;

      group.positions.push({
        ...creation,
        sourcePair: creation.pair,
        sourceCanonical: key
      });
    }

    return Array.from(groups.values())
      .filter(group => group.count >= minPositions)
      .map(group => ({
        pair: group.canonical,
        canonical: group.canonical,
        reverse:
          group.canonical[1] + group.canonical[0],
        count: group.count,
        positions: group.positions
      }))
      .sort((a, b) =>
        b.count - a.count ||
        a.canonical.localeCompare(b.canonical)
      );
  }

  // =====================================================
  // 9. AP DUNG TOA DO MAU SANG NGAY N-1
  // =====================================================

  /*
   * Khong tim mau moi tren ngay N-1.
   * Khong doi cellId.
   * Khong doi digitIndex.
   * Chi thay gia tri so cua ngay N-1.
   */

  function applyOneCreation(creation, previousDay) {
    const leftDigit = getDigit(
      previousDay,
      creation.left
    );

    const rightDigit = getDigit(
      previousDay,
      creation.right
    );

    if (
      leftDigit === null ||
      rightDigit === null
    ) {
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

    return {
      ...creation,

      appliedPair: leftDigit + rightDigit,

      appliedCanonical: canonicalPair(
        leftDigit + rightDigit
      ),

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
        const result = applyOneCreation(
          creation,
          previousDay
        );

        applied.push({
          sourceCanonical: group.canonical,
          sourcePair: creation.sourcePair,
          ...result
        });
      }
    }

    return applied;
  }

  // =====================================================
  // 10. LAY DUOI 2 SO DB -> G7 CUA NGAY N
  // =====================================================

  const RESULT_PRIZES = [
    "DB", "G1", "G2", "G3",
    "G4", "G5", "G6", "G7"
  ];

  function collectActualTails(sourceDay) {
    const tails = [];

    for (const prize of RESULT_PRIZES) {
      const numbers = getNumbers(sourceDay, prize);

      numbers.forEach((number, index) => {
        if (number.length < 2) {
          return;
        }

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

  // =====================================================
  // 11. DOI CHIEU CAP NGAY N-1 VOI KET QUA NGAY N
  // =====================================================

  /*
   * QUAN TRONG:
   * applied duoc tao tu previousDay (N-1).
   * actualTails duoc lay tu sourceDay (N).
   *
   * Neu cap 12 thi chap nhan duoi 12 hoac 21.
   */

  function matchActualResults(
    applied,
    sourceDay
  ) {
    const actualTails = collectActualTails(sourceDay);

    const matched = [];
    const unmatched = [];

    for (const item of applied) {
      if (
        item.status !== "OK" ||
        !item.appliedPair
      ) {
        continue;
      }

      const pair = item.appliedPair;
      const reverse = pair[1] + pair[0];

      const hits = actualTails.filter(result =>
        result.tail === pair ||
        result.tail === reverse
      );

      const record = {
        ...item,
        matched: hits.length > 0,
        matchedResults: hits
      };

      if (hits.length > 0) {
        matched.push(record);
      } else {
        unmatched.push(record);
      }
    }

    // Gom cac cap da khop theo cap dao chieu.
    const groups = new Map();

    for (const item of matched) {
      const key = item.appliedCanonical;

      if (!groups.has(key)) {
        groups.set(key, {
          pair: key,
          canonical: key,
          count: 0,
          positions: [],
          matchedResults: []
        });
      }

      const group = groups.get(key);

      group.count++;
      group.positions.push(item);
      group.matchedResults.push(
        ...item.matchedResults
      );
    }

    const matchedGroups = Array.from(groups.values())
      .map(group => {
        const uniqueResults = [];
        const seen = new Set();

        for (const result of group.matchedResults) {
          const key = [
            result.prize,
            result.numberIndex,
            result.tail,
            result.number
          ].join("|");

          if (seen.has(key)) continue;

          seen.add(key);
          uniqueResults.push(result);
        }

        return {
          ...group,
          matchedResults: uniqueResults
        };
      })
      .sort((a, b) =>
        b.count - a.count ||
        a.canonical.localeCompare(b.canonical)
      );

    return {
      actualTails,
      matched,
      unmatched,
      matchedGroups
    };
  }

  // =====================================================
  // 12. HAM PHAN TICH CHINH
  // =====================================================

  function analyze(
    sourceDay,
    previousDay,
    options = {}
  ) {
    const source = sourceDay ||
      TEST_DATA[CONFIG.sourceDate];

    const previous = previousDay ||
      TEST_DATA[CONFIG.targetDate];

    const minPositions = Number(
      options.minPositions ||
      CONFIG.minPositions
    );

    const regions = options.regions ||
      REGION_CONFIG;

    if (
      !Number.isInteger(minPositions) ||
      minPositions < 1
    ) {
      throw new Error(
        "Nguong minPositions phai la so nguyen duong."
      );
    }

    validateDay(source, "ngay N");
    validateDay(previous, "ngay N-1");
    validateRegions(regions);

    // Buoc 1: Tim mau tren ngay N.
    const sourceCreations = createAllPairs(
      source,
      regions
    );

    // Buoc 2: Loc mau toi thieu 5 vi tri.
    const patterns = groupCreations(
      sourceCreations,
      minPositions
    );

    // Buoc 3: Ap dung toa do sang ngay N-1.
    const applied = applyPatterns(
      patterns,
      previous
    );

    // Buoc 4: Doi chieu voi ket qua ngay N.
    const comparison = matchActualResults(
      applied,
      source
    );

    const validApplied = applied.filter(
      item => item.status === "OK"
    );

    return {
      version: VERSION,

      sourceDate:
        source.date || CONFIG.sourceDate,

      targetDate:
        previous.date || CONFIG.targetDate,

      comparisonDate:
        source.date || CONFIG.sourceDate,

      minPositions,

      regionCount: regions.length,

      sourceCreationCount:
        sourceCreations.length,

      qualifiedPatternCount:
        patterns.length,

      appliedPositionCount:
        applied.length,

      validAppliedPositionCount:
        validApplied.length,

      matchedPositionCount:
        comparison.matched.length,

      unmatchedPositionCount:
        comparison.unmatched.length,

      matchedPairGroupCount:
        comparison.matchedGroups.length,

      patterns,
      applied,

      actualTails:
        comparison.actualTails,

      matched:
        comparison.matched,

      unmatched:
        comparison.unmatched,

      matchedGroups:
        comparison.matchedGroups,

      summary: {
        sourceDate:
          source.date || CONFIG.sourceDate,

        appliedDate:
          previous.date || CONFIG.targetDate,

        comparisonDate:
          source.date || CONFIG.sourceDate,

        sourceCreations:
          sourceCreations.length,

        qualifiedPatterns:
          patterns.length,

        appliedPositions:
          applied.length,

        validAppliedPositions:
          validApplied.length,

        matchedPositions:
          comparison.matched.length,

        unmatchedPositions:
          comparison.unmatched.length,

        matchedPairGroups:
          comparison.matchedGroups.length
      },

      note:
        "Mau duoc tim tren ngay N; toa do duoc ap dung sang ngay N-1; cap tao ra duoc doi chieu voi duoi DB den G7 cua ngay N. TEST_DATA la du lieu thu nghiem."
    };
  }

  // =====================================================
  // 13. XUAT API
  // =====================================================

  const API = {
    VERSION,
    CONFIG,
    TEST_DATA,
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
    window.analyze = analyze;
  }

  if (
    typeof module !== "undefined" &&
    module.exports
  ) {
    module.exports = API;
  }

})(typeof globalThis !== "undefined" ? globalThis : this);
