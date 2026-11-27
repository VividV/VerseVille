/**
 * A simple queue so game saves and cloud sync never interleave: while sync is
 * merging and writing, a finished game waits a moment (and vice versa).
 * Don't call an exclusive function from inside another one — it would wait forever.
 */
let queue: Promise<unknown> = Promise.resolve()

export function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}
