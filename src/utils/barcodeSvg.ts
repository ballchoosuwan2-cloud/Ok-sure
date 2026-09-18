/**
 * SVG Barcode Renderer (Code 128 Subset B)
 * Generates pure SVG barcode strings and elements without external heavy libraries
 */

// Code 128 patterns (Subset B)
const CODE128_PATTERNS: { [key: number]: string } = {
  0: '212222', 1: '222122', 2: '222221', 3: '121223', 4: '121322',
  5: '131222', 6: '122213', 7: '122312', 8: '132212', 9: '221213',
  10: '221312', 11: '231212', 12: '112232', 13: '122132', 14: '122231',
  15: '113222', 16: '123122', 17: '123221', 18: '223211', 19: '221132',
  20: '221231', 21: '213212', 22: '223112', 23: '312131', 24: '311222',
  25: '321122', 26: '321221', 27: '312212', 28: '322112', 29: '322211',
  30: '212123', 31: '212321', 32: '232121', 33: '111323', 34: '131123',
  35: '131321', 36: '112313', 37: '132113', 38: '132311', 39: '211313',
  40: '231113', 41: '231311', 42: '112133', 43: '112331', 44: '132131',
  45: '113123', 46: '113321', 47: '133121', 48: '313121', 49: '211331',
  50: '231131', 51: '213113', 52: '213311', 53: '213131', 54: '311123',
  55: '311321', 56: '331121', 57: '312113', 58: '312311', 59: '332111',
  60: '314111', 61: '221411', 62: '431111', 63: '111224', 64: '111422',
  65: '121124', 66: '121421', 67: '141122', 68: '141221', 69: '112214',
  70: '112412', 71: '122114', 72: '122411', 73: '142112', 74: '142211',
  75: '241211', 76: '221114', 77: '413111', 78: '241112', 79: '134111',
  80: '111242', 81: '121142', 82: '121241', 83: '114212', 84: '124112',
  85: '124211', 86: '411212', 87: '421112', 88: '421211', 89: '212141',
  90: '214121', 91: '412121', 92: '111143', 93: '111341', 94: '131141',
  95: '114113', 96: '114311', 97: '411113', 98: '411311', 99: '113141',
  100: '114131', 101: '311141', 102: '411131',
  104: '211214', // Start Code B
  106: '2331112' // Stop code
};

export function renderBarcodeSvg(
  text: string,
  width: number = 240,
  height: number = 60,
  showText: boolean = true
): string {
  const cleanText = text.trim() || '885000000001';
  // Subset B starts with 104
  const codes: number[] = [104];
  let checksum = 104;

  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    // ASCII 32-126
    const codeVal = charCode - 32;
    const safeVal = (codeVal >= 0 && codeVal <= 95) ? codeVal : 0;
    codes.push(safeVal);
    checksum += safeVal * (i + 1);
  }

  const checkVal = checksum % 103;
  codes.push(checkVal);
  codes.push(106); // Stop code

  let patternStr = '';
  for (const c of codes) {
    patternStr += CODE128_PATTERNS[c] || '212222';
  }

  // Calculate total modules
  let totalModules = 0;
  for (let i = 0; i < patternStr.length; i++) {
    totalModules += parseInt(patternStr[i], 10);
  }

  const barHeight = showText ? height - 16 : height;
  let currentX = 10;
  const paddingX = 10;
  const usableWidth = width - paddingX * 2;
  const moduleWidth = Math.max(1, usableWidth / totalModules);

  let rects = '';
  let isBar = true;

  for (let i = 0; i < patternStr.length; i++) {
    const count = parseInt(patternStr[i], 10);
    const w = count * moduleWidth;
    if (isBar) {
      rects += `<rect x="${currentX.toFixed(2)}" y="2" width="${w.toFixed(2)}" height="${barHeight}" fill="#0f172a" />`;
    }
    currentX += w;
    isBar = !isBar;
  }

  const totalCalculatedWidth = currentX + paddingX;
  const textSvg = showText
    ? `<text x="${(totalCalculatedWidth / 2).toFixed(2)}" y="${(height - 2).toFixed(2)}" font-family="monospace, sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#334155" letter-spacing="2">${cleanText}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalCalculatedWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet" class="barcode-svg">
    <rect width="${totalCalculatedWidth}" height="${height}" fill="transparent" />
    ${rects}
    ${textSvg}
  </svg>`;
}
