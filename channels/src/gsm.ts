// GSM-7: the character set every basic phone handles. Stay inside it and one SMS holds 160
// characters; one character outside it (a curly quote, "³", an emoji) and the message drops to
// 70 characters per part, costs 2-3x and may arrive garbled.
const BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const EXT = '^{}\\[~]|€\f';

export function isGsm7(s: string): boolean {
  for (const ch of s) if (!BASIC.includes(ch) && !EXT.includes(ch)) return false;
  return true;
}

/** Septets used (extension characters count twice). */
export function gsm7Length(s: string): number {
  let n = 0;
  for (const ch of s) n += EXT.includes(ch) ? 2 : 1;
  return n;
}

export const SMS_MAX = 160;
/** Practical USSD screen limit across Kenyan networks. */
export const USSD_MAX = 182;
