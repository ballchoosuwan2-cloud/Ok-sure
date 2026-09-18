/**
 * Thai PromptPay EMVCo QR Code Payload Generator
 * Conforms to Bank of Thailand (BOT) PromptPay specification
 */

function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    let x = ((crc >> 8) ^ data.charCodeAt(i)) & 0xff;
    x ^= x >> 4;
    crc = ((crc << 8) ^ (x << 12) ^ (x << 5) ^ x) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

export function generatePromptPayPayload(target: string, amount?: number): string {
  // Format target: Thai phone number (08x, 09x) or Thai National ID / Tax ID (13 digits)
  const cleanTarget = target.replace(/[^0-9]/g, '');
  let formattedTarget = cleanTarget;
  let targetType = '01'; // 01 for mobile phone, 02 for Tax/ID card

  if (cleanTarget.length === 10 && cleanTarget.startsWith('0')) {
    // Mobile phone: prefix with 66 and remove leading 0 -> e.g. 0066812345678
    formattedTarget = '0066' + cleanTarget.substring(1);
    targetType = '01';
  } else if (cleanTarget.length === 9 && cleanTarget.startsWith('0')) {
    formattedTarget = '0066' + cleanTarget.substring(1);
    targetType = '01';
  } else {
    // 13-digit National ID or Tax ID
    formattedTarget = cleanTarget;
    targetType = '02';
  }

  // Tag 29: Merchant Account Information - PromptPay
  const aid = formatTag('00', 'A000000677010111');
  const recipient = formatTag(targetType, formattedTarget);
  const merchantInfo = formatTag('29', aid + recipient);

  // Payload elements
  let raw = '';
  raw += formatTag('00', '01'); // Payload Format Indicator
  raw += formatTag('01', amount ? '12' : '11'); // 12 = Dynamic (with amount), 11 = Static
  raw += merchantInfo;
  raw += formatTag('53', '764'); // Country Currency Code: 764 (THB)
  
  if (amount && amount > 0) {
    raw += formatTag('54', amount.toFixed(2)); // Amount
  }

  raw += formatTag('58', 'TH'); // Country Code: Thailand

  // Tag 63: CRC placeholder
  raw += '6304';
  const checksum = crc16(raw);

  return raw + checksum;
}
