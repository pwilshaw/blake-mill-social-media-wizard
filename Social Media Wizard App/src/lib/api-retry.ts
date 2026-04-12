// T092b — Fetch with exponential backoff + API client factory

const DEFAULT_MAX_RETRIES = 3
const BASE_DELAY_MS = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function jitteredDelay(attempt: number): number {
  // Exponential backoff: 500ms, 1000ms, 2000ms … with ±20% jitter
  const base = BASE_DELAY_MS * Math.pow(2, attempt)
  const jitter = base * 0.2 * (Math.random() * 2 - 1)
  return Math.round(base + jitter)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// fetchWithRetry
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(jitteredDelay(attempt - 1))
    }

    let response: Response
    try {
      response = await fetch(url, options)
    } catch (networkError) {
      // Network-level failure (DNS, connection refused, etc.)
      lastError = networkError instanceof Error ? networkError : new Error(String(networkError))
      if (attempt === maxRetries) {
        throw new Error(
          `Network request failed after ${maxRetries + 1} attempt(s): ${lastError.message}`,
        )
      }
      continue
    }

    if (!isRetryableStatus(response.status)) {
      // Return immediately — caller decides if the status is an error
      return response
    }

    lastError = new Error(`HTTP ${response.status} ${response.statusText}`)

    if (attempt === maxRetries) {
      throw new Error(
        `Request to ${url} failed with ${response.status} after ${maxRetries + 1} attempt(s)`,
      )
    }
  }

  // Unreachable but satisfies the type checker
  throw lastError ?? new Error('fetchWithRetry: exhausted retries')
}

// ---------------------------------------------------------------------------
// createApiClient
// ---------------------------------------------------------------------------

interface ApiClientOptions {
  headers?: Record<string, string>
  maxRetries?: number
}

interface ApiClient {
  get: (path: string, init?: RequestInit) => Promise<Response>
  post: (path: string, body: unknown, init?: RequestInit) => Promise<Response>
  put: (path: string, body: unknown, init?: RequestInit) => Promise<Response>
  patch: (path: string, body: unknown, init?: RequestInit) => Promise<Response>
  delete: (path: string, init?: RequestInit) => Promise<Response>
}

function createApiClient(baseUrl: string, clientOptions?: ApiClientOptions): ApiClient {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...clientOptions?.headers,
  }
  const maxRetries = clientOptions?.maxRetries ?? DEFAULT_MAX_RETRIES

  function buildUrl(path: string): string {
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    const segment = path.startsWith('/') ? path : `/${path}`
    return `${base}${segment}`
  }

  function mergeInit(init?: RequestInit): RequestInit {
    return {
      ...init,
      headers: {
        ...defaultHeaders,
        ...(init?.headers as Record<string, string> | undefined),
      },
    }
  }

  function withBody(method: string, body: unknown, init?: RequestInit): RequestInit {
    return mergeInit({
      ...init,
      method,
      body: JSON.stringify(body),
    })
  }

  return {
    get(path, init) {
      return fetchWithRetry(buildUrl(path), mergeInit({ ...init, method: 'GET' }), maxRetries)
    },
    post(path, body, init) {
      return fetchWithRetry(buildUrl(path), withBody('POST', body, init), maxRetries)
    },
    put(path, body, init) {
      return fetchWithRetry(buildUrl(path), withBody('PUT', body, init), maxRetries)
    },
    patch(path, body, init) {
      return fetchWithRetry(buildUrl(path), withBody('PATCH', body, init), maxRetries)
    },
    delete(path, init) {
      return fetchWithRetry(buildUrl(path), mergeInit({ ...init, method: 'DELETE' }), maxRetries)
    },
  }
}

export { fetchWithRetry, createApiClient }
export type { ApiClient, ApiClientOptions }
