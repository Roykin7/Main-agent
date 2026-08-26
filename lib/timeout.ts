/**
 * Races a promise against a timer, resolving with `fallback` if the timer
 * wins. The original promise is not cancelled — it keeps running in the
 * background and its result is discarded — so this only bounds how long the
 * *caller* waits, not the underlying work itself.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}
