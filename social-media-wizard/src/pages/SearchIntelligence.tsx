// Search Intelligence — SerpAPI-powered keyword research and content optimisation
import { useState } from 'react'
import {
  Search,
  TrendingUp,
  MessageCircleQuestion,
  ExternalLink,
  ShoppingBag,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Hash,
  Globe,
  ArrowUpRight,
} from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

type Tab = 'research' | 'angles' | 'trending'

interface OrganicResult {
  position: number
  title: string
  link: string
  snippet: string
  displayed_link: string
}

interface PAA {
  question: string
  snippet: string
  link?: string
}

interface RelatedSearch {
  query: string
  link?: string
}

interface ShoppingResult {
  title: string
  price: string
  source: string
  link: string
  thumbnail?: string
}

interface ContentAngle {
  type: 'question' | 'search_term'
  angle: string
  context: string
  source: string
}

interface TrendQuery {
  query: string
  value: string | number
  extracted_value?: number
}

interface KeywordData {
  query: string
  total_results: string
  organic_results: OrganicResult[]
  people_also_ask: PAA[]
  related_searches: RelatedSearch[]
  shopping_results: ShoppingResult[]
}

interface AnglesData {
  query: string
  angles: ContentAngle[]
  total: number
}

interface TrendingData {
  query: string
  rising_queries: TrendQuery[]
  top_queries: TrendQuery[]
}

async function searchApi(action: string, query: string, location?: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-intelligence`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ action, query, location }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Search failed')
  }
  return res.json()
}

const QUICK_SEARCHES = [
  'mens bold shirts UK',
  'mens floral shirts 2026',
  'unique mens shirts online',
  'best mens shirt brands UK',
  'mens festival fashion',
  'summer shirts men',
  'quirky mens shirts',
  'mens linen shirts UK',
]

export default function SearchIntelligence() {
  const [tab, setTab] = useState<Tab>('research')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('United Kingdom')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const [keywordData, setKeywordData] = useState<KeywordData | null>(null)
  const [anglesData, setAnglesData] = useState<AnglesData | null>(null)
  const [trendingData, setTrendingData] = useState<TrendingData | null>(null)

  async function handleSearch(searchQuery?: string) {
    const q = searchQuery ?? query
    if (!q.trim()) return

    setQuery(q)
    setLoading(true)
    setError(null)

    try {
      if (tab === 'research') {
        setKeywordData(await searchApi('keyword_research', q, location))
      } else if (tab === 'angles') {
        setAnglesData(await searchApi('content_angles', q, location))
      } else if (tab === 'trending') {
        setTrendingData(await searchApi('trending', q))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
  }

  function CopyButton({ text }: { text: string }) {
    const copied = copiedText === text
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          copyToClipboard(text)
        }}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        title="Copy"
      >
        {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-2.5">
          <Globe className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Search Intelligence</h1>
          <p className="text-sm text-muted-foreground">
            Live Google data to optimise your social content for organic reach
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search keywords, product terms, or topics..."
              className="w-full rounded-xl border border-input bg-background pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-xl border border-input bg-background px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="United Kingdom">UK (all)</option>
            <option value="London, England">London</option>
            <option value="Manchester, England">Manchester</option>
            <option value="Birmingham, England">Birmingham</option>
            <option value="Leeds, England">Leeds</option>
            <option value="Liverpool, England">Liverpool</option>
            <option value="Bristol, England">Bristol</option>
            <option value="Edinburgh, Scotland">Edinburgh</option>
            <option value="Glasgow, Scotland">Glasgow</option>
          </select>
          <button
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Quick searches */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground py-1">Try:</span>
          {QUICK_SEARCHES.map((qs) => (
            <button
              key={qs}
              type="button"
              onClick={() => handleSearch(qs)}
              className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              {qs}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'research', label: 'Keyword Research', icon: Search },
          { key: 'angles', label: 'Content Angles', icon: Sparkles },
          { key: 'trending', label: 'Trending', icon: TrendingUp },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {tab === key && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KEYWORD RESEARCH TAB */}
      {tab === 'research' && keywordData && !loading && (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            {keywordData.total_results} results for "{keywordData.query}"
          </p>

          {/* People Also Ask */}
          {keywordData.people_also_ask.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <MessageCircleQuestion className="h-4 w-4 text-amber-600" />
                People Also Ask
                <span className="text-xs font-normal text-muted-foreground">
                  — use these as post hooks and captions
                </span>
              </h2>
              <div className="space-y-2">
                {keywordData.people_also_ask.map((paa, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{paa.question}</p>
                      {paa.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {paa.snippet}
                        </p>
                      )}
                    </div>
                    <CopyButton text={paa.question} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Searches — hashtag/keyword goldmine */}
          {keywordData.related_searches.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Hash className="h-4 w-4 text-blue-600" />
                Related Searches
                <span className="text-xs font-normal text-muted-foreground">
                  — use as hashtags and SEO keywords
                </span>
              </h2>
              <div className="flex flex-wrap gap-2">
                {keywordData.related_searches.map((rs, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => copyToClipboard(rs.query)}
                    className="group flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    {rs.query}
                    <Copy className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Organic Results — competitor analysis */}
          {keywordData.organic_results.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <Globe className="h-4 w-4 text-emerald-600" />
                Top Organic Results
                <span className="text-xs font-normal text-muted-foreground">
                  — what's ranking and what to compete with
                </span>
              </h2>
              <div className="space-y-3">
                {keywordData.organic_results.map((result, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground tabular-nums">
                      {result.position}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={result.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {result.title}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      <p className="text-[11px] text-emerald-700 mt-0.5">{result.displayed_link}</p>
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.snippet}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Shopping Results */}
          {keywordData.shopping_results.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <ShoppingBag className="h-4 w-4 text-violet-600" />
                Shopping Results
                <span className="text-xs font-normal text-muted-foreground">
                  — competitor pricing and positioning
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {keywordData.shopping_results.map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-border p-3 hover:border-primary/30 transition-colors"
                  >
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt="" className="h-16 w-full object-contain mb-2" />
                    )}
                    <p className="text-xs font-medium text-foreground line-clamp-2">{item.title}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-1">{item.price}</p>
                    <p className="text-[10px] text-muted-foreground">{item.source}</p>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* CONTENT ANGLES TAB */}
      {tab === 'angles' && anglesData && !loading && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {anglesData.total} content angles for "{anglesData.query}"
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {anglesData.angles.map((angle, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div
                  className={`rounded-lg p-2 shrink-0 ${
                    angle.type === 'question'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {angle.type === 'question' ? (
                    <MessageCircleQuestion className="h-4 w-4" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{angle.angle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{angle.context}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{angle.source}</span>
                    <CopyButton text={angle.angle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRENDING TAB */}
      {tab === 'trending' && trendingData && !loading && (
        <div className="space-y-6">
          {/* Rising queries */}
          {trendingData.rising_queries.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                Rising Searches
                <span className="text-xs font-normal text-muted-foreground">
                  — breakout terms to capitalise on now
                </span>
              </h2>
              <div className="space-y-2">
                {trendingData.rising_queries.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSearch(String(q.query))}
                        className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {q.query}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {q.value}
                      </span>
                      <CopyButton text={String(q.query)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top queries */}
          {trendingData.top_queries.length > 0 && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Top Related Searches
              </h2>
              <div className="flex flex-wrap gap-2">
                {trendingData.top_queries.map((q, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSearch(String(q.query))}
                    className="group flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all"
                  >
                    {q.query}
                    <span className="text-[10px] text-muted-foreground">{q.value}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !keywordData && !anglesData && !trendingData && !error && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center space-y-3">
          <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Search for keywords related to your products to discover content angles,
            trending terms, and organic opportunities.
          </p>
          <p className="text-xs text-muted-foreground">
            Results come live from Google — use them to optimise your post copy, hashtags, and ad targeting.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Searching Google...</p>
        </div>
      )}
    </div>
  )
}
