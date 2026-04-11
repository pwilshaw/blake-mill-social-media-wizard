import { supabase } from './supabase'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function callEdgeFunction<T>(
  functionName: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, params } = options

  const queryString = params
    ? '?' + new URLSearchParams(params).toString()
    : ''

  const { data, error } = await supabase.functions.invoke(
    `${functionName}${queryString}`,
    {
      method,
      body: body ? JSON.stringify(body) : undefined,
      headers: { 'Content-Type': 'application/json' },
    }
  )

  if (error) {
    throw new ApiError(
      error.message || 'Edge Function call failed',
      500,
      error
    )
  }

  return data as T
}
