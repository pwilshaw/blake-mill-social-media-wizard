// Tiny concurrency limiter. No dependency — the codebase doesn't have p-limit.
//
// Runs at most `limit` tasks in flight. Calls `onProgress(index)` as each task
// resolves (or rejects). Resolves once every task has settled, returning
// results in input order.

export interface RunOptions {
  limit: number
  onProgress?: (completedIndex: number) => void
  /** Checked before dispatching each next task. Return true to stop early. */
  shouldAbort?: () => boolean
}

export async function runWithLimit<T>(
  tasks: Array<() => Promise<T>>,
  opts: RunOptions,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = new Array(tasks.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (true) {
      if (opts.shouldAbort?.()) return
      const i = cursor++
      if (i >= tasks.length) return
      try {
        const value = await tasks[i]()
        results[i] = { status: 'fulfilled', value }
      } catch (err) {
        results[i] = { status: 'rejected', reason: err }
      }
      opts.onProgress?.(i)
    }
  }

  const workerCount = Math.max(1, Math.min(opts.limit, tasks.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}
