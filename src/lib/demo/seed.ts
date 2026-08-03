/** Deterministic non-negative 32-bit string hash (djb2-ish). */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function seededPick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}
