/**
 * Approximate FIFA men's ranking points for the nations that can appear in the
 * 2026 World Cup, keyed by the 3-letter code used in countries.ts. Higher is
 * stronger. This is a static snapshot used only as one input (alongside live
 * form and betting odds) to *estimate* knockout match-ups — it is not live data.
 */
export const FIFA_POINTS: Record<string, number> = {
  ARG: 1886, FRA: 1859, ESP: 1853, ENG: 1819, BRA: 1777, POR: 1770, NED: 1752,
  BEL: 1739, GER: 1717, CRO: 1700, MAR: 1695, COL: 1690, URU: 1683, USA: 1665,
  JPN: 1655, MEX: 1658, SUI: 1650, IRN: 1640, SEN: 1632, AUT: 1604, KOR: 1580,
  ECU: 1567, SWE: 1565, TUR: 1562, NOR: 1535, AUS: 1525, EGY: 1520, ALG: 1507,
  CAN: 1505, CIV: 1502, GHA: 1499, TUN: 1492, SCO: 1487, PAR: 1476, COD: 1462,
  QAT: 1450, UZB: 1437, RSA: 1432, PAN: 1428, KSA: 1419, BIH: 1407, IRQ: 1404,
  CPV: 1389, JOR: 1379, CUW: 1331, HAI: 1306, NZL: 1255,
};

/** Fallback for any nation not in the snapshot. */
export const FIFA_DEFAULT = 1300;

/**
 * Approximate current FIFA men's world ranking position per nation (3-letter
 * code). A static snapshot for display — not live. Non-qualified nations occupy
 * some intervening positions, so these aren't contiguous.
 */
export const FIFA_RANK: Record<string, number> = {
  ARG: 1, ESP: 2, FRA: 3, ENG: 4, BRA: 5, POR: 6, NED: 7, BEL: 8, CRO: 9, GER: 10,
  MAR: 11, COL: 13, URU: 14, USA: 15, MEX: 16, JPN: 17, IRN: 18, SUI: 19, SEN: 20,
  AUT: 22, KOR: 23, ECU: 24, AUS: 26, SWE: 27, TUR: 28, NOR: 30, CAN: 31, QAT: 35,
  ALG: 36, SCO: 39, CIV: 40, GHA: 41, TUN: 42, PAN: 44, PAR: 46, EGY: 33, COD: 54,
  IRQ: 55, UZB: 57, RSA: 58, KSA: 60, JOR: 62, CPV: 70, BIH: 75, CUW: 82, HAI: 83,
  NZL: 89,
};

