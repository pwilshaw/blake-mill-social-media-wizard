// Tiny preset-only cron evaluator. Supports the cron_expr presets the UI lets
// users pick — not a full RFC parser. Accepts standard 5-field cron strings of
// the form `m h dom mon dow` where each field is either '*' or a single int
// (or a range like '1-5' for dow). Anything else returns false.
//
// We compare against UTC. The team is single-owner so user TZ is set elsewhere
// at the UI; the cadence is "roughly daily / weekly" so UTC is fine for v1.

export interface ParsedCron {
  minute: number | null   // null = wildcard
  hour: number | null
  dom: number | null
  month: number | null
  dow: number[] | null    // null = wildcard, list otherwise
}

export function parseCron(expr: string): ParsedCron | null {
  const parts = expr.trim().split(/\s+/)
  if (parts.length !== 5) return null
  const [m, h, dom, mon, dow] = parts

  const numOrStar = (s: string): number | null | undefined => {
    if (s === '*') return null
    const n = Number(s)
    return Number.isInteger(n) ? n : undefined
  }

  const mv = numOrStar(m)
  const hv = numOrStar(h)
  const dv = numOrStar(dom)
  const monv = numOrStar(mon)
  if (mv === undefined || hv === undefined || dv === undefined || monv === undefined) return null

  let dowList: number[] | null
  if (dow === '*') dowList = null
  else {
    const range = dow.match(/^(\d+)-(\d+)$/)
    if (range) {
      const a = Number(range[1])
      const b = Number(range[2])
      if (!Number.isInteger(a) || !Number.isInteger(b) || a > b) return null
      dowList = []
      for (let i = a; i <= b; i++) dowList.push(i)
    } else {
      const list = dow.split(',').map((x) => Number(x))
      if (list.some((x) => !Number.isInteger(x))) return null
      dowList = list
    }
  }

  return { minute: mv, hour: hv, dom: dv, month: monv, dow: dowList }
}

/**
 * Returns true if the cron expression should fire at `now` given the last
 * run time `lastRunAt` (or null for never-run). We accept any match within
 * the last 5 minutes (the dispatcher tick window) and require at least 60
 * minutes since the previous run for daily/weekly templates so a flapping
 * dispatcher can't double-post.
 */
export function isDue(expr: string, lastRunAt: string | null, now: Date): boolean {
  const p = parseCron(expr)
  if (!p) return false

  const minute = now.getUTCMinutes()
  const hour = now.getUTCHours()
  const dom = now.getUTCDate()
  const month = now.getUTCMonth() + 1
  const dow = now.getUTCDay()

  if (p.minute !== null && p.minute !== minute) {
    // Allow late within the same hour: minute-of-hour anywhere in [target, target+4]
    if (!(minute >= p.minute && minute <= p.minute + 4)) return false
  }
  if (p.hour !== null && p.hour !== hour) return false
  if (p.dom !== null && p.dom !== dom) return false
  if (p.month !== null && p.month !== month) return false
  if (p.dow !== null && !p.dow.includes(dow)) return false

  // Debounce
  if (lastRunAt) {
    const lastMs = new Date(lastRunAt).getTime()
    if (now.getTime() - lastMs < 60 * 60 * 1000) return false
  }
  return true
}
