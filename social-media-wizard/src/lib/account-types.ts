// Account type detection and visual metadata
// Used throughout the app to distinguish personal pages, business pages, and ad accounts.

import type { ChannelAccount } from './types'

export type AccountType = 'ad_account' | 'business_page' | 'personal_page'

export interface AccountTypeMeta {
  label: string
  color: string
  bgColor: string
  borderColor: string
  icon: 'megaphone' | 'building' | 'user'
}

const ACCOUNT_TYPE_META: Record<AccountType, AccountTypeMeta> = {
  ad_account: {
    label: 'Ad Account',
    color: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    icon: 'megaphone',
  },
  business_page: {
    label: 'Business Page',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: 'building',
  },
  personal_page: {
    label: 'Personal Page',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: 'user',
  },
}

export function detectAccountType(account: ChannelAccount): AccountType {
  const name = account.account_name.toLowerCase()
  const id = account.account_id

  // Ad accounts have act_ prefix or (Ads) suffix
  if (id.startsWith('act_') || name.includes('(ads)')) {
    return 'ad_account'
  }

  // Business indicators: company names, categories, multiple words that aren't a person's name
  // Personal pages tend to be just a first + last name
  const personalNamePattern = /^[A-Z][a-z]+ [A-Z][a-z]+$/
  if (personalNamePattern.test(account.account_name)) {
    return 'personal_page'
  }

  return 'business_page'
}

export function getAccountTypeMeta(type: AccountType): AccountTypeMeta {
  return ACCOUNT_TYPE_META[type]
}

export function getAccountTypeForAccount(account: ChannelAccount): AccountTypeMeta {
  return ACCOUNT_TYPE_META[detectAccountType(account)]
}
