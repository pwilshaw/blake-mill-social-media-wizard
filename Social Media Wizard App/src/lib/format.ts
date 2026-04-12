import { format, formatDistanceToNow } from 'date-fns'
import type { CampaignStatus } from './types'

export function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(
    amount
  )
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString('en-GB')
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy')
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'dd MMM yyyy HH:mm')
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true })
}

export const statusColour: Record<CampaignStatus, string> = {
  draft: 'text-muted-foreground bg-muted',
  scheduled: 'text-info bg-info/10',
  active: 'text-success bg-success/10',
  paused: 'text-warning bg-warning/10',
  completed: 'text-foreground bg-secondary',
  cancelled: 'text-destructive bg-destructive/10',
}
