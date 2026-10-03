// Numbers in model text are checked against the engine JSON; any mismatch falls back to the
// template. The model never invents measurements (build addendum, AI rules).

const NUMBER_WORDS = new Set([
  // English
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty',
  'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred', 'thousand', 'half', 'dozen', 'double', 'twice',
  // Kiswahili
  'sifuri', 'moja', 'mbili', 'tatu', 'nne', 'tano', 'sita', 'saba', 'nane', 'tisa', 'kumi', 'ishirini',
  'thelathini', 'arobaini', 'hamsini', 'sitini', 'sabini', 'themanini', 'tisini', 'mia', 'elfu', 'nusu', 'robo',
]);

/** Digits in the text, with thousands separators removed and comma decimals accepted. */
export function extractNumbers(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\d{1,3}(?:[ , ]\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?/g)) {
    let s = m[0];
    if (/^\d{1,3}([ , ]\d{3})+/.test(s)) s = s.replace(/[ , ]/g, '');
    else s = s.replace(',', '.');
    out.push(Number(s));
  }
  return out;
}

export type GuardResult = { ok: true } | { ok: false; reason: 'unknown_number'; value: number } | { ok: false; reason: 'number_word'; word: string };

export function verifyNumbers(text: string, allowed: number[]): GuardResult {
  for (const word of text.toLowerCase().match(/\p{L}+/gu) ?? []) {
    if (NUMBER_WORDS.has(word)) return { ok: false, reason: 'number_word', word };
  }
  for (const n of extractNumbers(text)) {
    if (!allowed.some((a) => Math.abs(a - n) < 1e-6)) return { ok: false, reason: 'unknown_number', value: n };
  }
  return { ok: true };
}
