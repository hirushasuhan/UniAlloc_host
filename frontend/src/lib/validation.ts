// Mirror of backend-php/src/helpers/ContactPolicy.php.
//
// The server is the real control — this only saves a round-trip and gives the
// user an instant, specific message instead of a 422. If one side changes,
// change the other.

const MIN_INTL_DIGITS  = 8
const MAX_INTL_DIGITS  = 15
const MIN_LOCAL_DIGITS = 9
const MAX_LOCAL_DIGITS = 12

/** Strips separators and rewrites a 00 international prefix as '+'. */
export function normaliseContact(value: string): string {
  const clean = value.trim().replace(/[\s\-().]/g, '')
  return clean.startsWith('00') ? `+${clean.slice(2)}` : clean
}

/** Returns an error message, or null when the number is acceptable. */
export function validateContact(value: string): string | null {
  const clean = normaliseContact(value)

  if (clean === '') return 'Contact number is required.'
  if (!/^\+?[0-9]+$/.test(clean)) {
    return 'Contact number may only contain digits, and may start with +.'
  }

  const digits = clean.replace(/^\+/, '')

  if (clean.startsWith('+')) {
    if (digits.length < MIN_INTL_DIGITS || digits.length > MAX_INTL_DIGITS) {
      return 'Enter a valid international number, e.g. +94771234567.'
    }
  } else if (digits.length < MIN_LOCAL_DIGITS || digits.length > MAX_LOCAL_DIGITS) {
    return 'Enter a valid contact number, e.g. 0771234567 or +94771234567.'
  }

  // 0000000000 / 1111111111 and friends are what gets typed to get past a
  // "required" field, never a real number.
  if (/^(\d)\1+$/.test(digits)) {
    return 'That does not look like a real contact number.'
  }

  return null
}
