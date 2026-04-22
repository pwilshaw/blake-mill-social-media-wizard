import { Bot, CloudSun, Calendar, Users, Search, Ticket } from 'lucide-react'
import { ProviderConnector } from '@/components/integrations/ProviderConnector'
import type { ProviderSpec } from '@/components/integrations/ProviderConnector'
import { BrandAssets } from '@/components/integrations/BrandAssets'

const PROVIDERS: ProviderSpec[] = [
  {
    provider: 'anthropic',
    label: 'Anthropic (Claude)',
    description: 'Used by DEPTH content generation, performance ratings, engagement replies, and weekly summaries.',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    icon: Bot,
    placeholder: 'sk-ant-...',
  },
  {
    provider: 'klaviyo',
    label: 'Klaviyo',
    description: 'Pulls customer segments and profile counts for campaign targeting.',
    docsUrl: 'https://www.klaviyo.com/account#api-keys-tab',
    icon: Users,
    placeholder: 'pk_...',
  },
  {
    provider: 'weatherapi',
    label: 'WeatherAPI',
    description: '7-day UK forecast used by weather-triggered campaigns.',
    docsUrl: 'https://www.weatherapi.com/my/',
    icon: CloudSun,
    placeholder: 'abc123...',
  },
  {
    provider: 'predicthq',
    label: 'PredictHQ',
    description: 'Event detection for event-triggered campaigns. Pair with Ticketmaster for broader coverage.',
    docsUrl: 'https://control.predicthq.com/settings/tokens',
    icon: Calendar,
    placeholder: 'Bearer token',
  },
  {
    provider: 'ticketmaster',
    label: 'Ticketmaster',
    description: 'UK concerts, sports and events feed for event-triggered campaigns.',
    docsUrl: 'https://developer-acct.ticketmaster.com/user/me/apps',
    icon: Ticket,
    placeholder: 'Consumer key',
  },
  {
    provider: 'serpapi',
    label: 'SerpAPI',
    description: 'Search intelligence: keyword research, trending queries, content angles.',
    docsUrl: 'https://serpapi.com/manage-api-key',
    icon: Search,
    placeholder: 'Secret API key',
  },
]

export default function Integrations() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          API keys for third-party services. Keys are stored encrypted at rest in your project's database and only read by edge functions — they never hit the browser after saving.
        </p>
      </div>

      <BrandAssets />

      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((spec) => (
          <ProviderConnector key={spec.provider} spec={spec} />
        ))}
      </div>

      <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground space-y-1">
        <p>
          Already-set edge-function secrets take priority over keys saved here — so a Supabase-dashboard secret will always override this UI. Remove the secret first if you want to manage a key from here.
        </p>
        <p>
          OAuth-based integrations (Meta, Google Ads, Snapchat, Shopify) live under <a href="/channels" className="underline">Channels</a>.
        </p>
      </div>
    </div>
  )
}
