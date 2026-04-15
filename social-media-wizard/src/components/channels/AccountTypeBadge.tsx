import { Megaphone, Building2, User } from 'lucide-react'
import type { AccountType } from '@/lib/account-types'
import { getAccountTypeMeta } from '@/lib/account-types'

const ICONS = {
  megaphone: Megaphone,
  building: Building2,
  user: User,
} as const

export function AccountTypeBadge({ type }: { type: AccountType }) {
  const meta = getAccountTypeMeta(type)
  const Icon = ICONS[meta.icon]

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.color} ${meta.bgColor}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}
