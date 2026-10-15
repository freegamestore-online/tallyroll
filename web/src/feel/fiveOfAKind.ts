/** True when all five dice are rolled and show the same face. Unrolled dice read 0 and never match. */
export function isFiveOfAKind(values: readonly number[]): boolean {
  return values.length === 5 && values[0] !== 0 && values.every((v) => v === values[0]);
}
