import { useCallback, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ConfigStage } from '@/components/wtp/ConfigStage'
import { RunnerStage } from '@/components/wtp/RunnerStage'
import { ResultsStage } from '@/components/wtp/ResultsStage'
import { buildPairs } from '@/lib/wtp/pair-builder'
import { computeWtp } from '@/lib/wtp/wtp-calc'
import { runWithLimit } from '@/lib/concurrency'
import { PERSONAS } from '@/lib/wtp/personas'
import {
  createStudy,
  fetchStudy,
  finalizeStudy,
  runConsideration,
} from '@/lib/wtp/api'
import type {
  PersonaKey,
  WtpConfig,
  WtpResponse,
  WtpStudy,
} from '@/lib/types'

type Stage = 'config' | 'running' | 'results'

const CONCURRENCY_LIMIT = 5

export default function WtpStudyPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const existingQuery = useQuery<WtpStudy | null, Error>({
    queryKey: ['wtp_study', id],
    queryFn: () => fetchStudy(id ?? ''),
    enabled: Boolean(id),
  })

  const [stage, setStage] = useState<Stage>(id ? 'results' : 'config')
  const [study, setStudy] = useState<WtpStudy | null>(null)
  const [completed, setCompleted] = useState(0)
  const [inFlight, setInFlight] = useState(0)
  const [failed, setFailed] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const abortRef = useRef(false)

  // Hydrate from route param
  if (id && existingQuery.data && study?.id !== existingQuery.data.id) {
    setStudy(existingQuery.data)
    setStage('results')
  }

  const resetAll = useCallback(() => {
    abortRef.current = false
    setCompleted(0)
    setInFlight(0)
    setFailed(0)
    setErrorMsg(null)
    setStudy(null)
    setStage('config')
    if (id) navigate('/wtp-study', { replace: true })
  }, [id, navigate])

  const onRun = useCallback(
    async (args: {
      name: string
      persona_key: PersonaKey
      system_message: string
      config: WtpConfig
    }) => {
      setErrorMsg(null)
      abortRef.current = false
      setCompleted(0)
      setInFlight(0)
      setFailed(0)

      let created: WtpStudy
      try {
        created = await createStudy(args)
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to create study')
        return
      }

      setStudy(created)
      setStage('running')

      const pairs = buildPairs(args.config, args.config.responses_per_set)
      const outside_option = PERSONAS[args.persona_key].outside_option

      const tasks = pairs.map((pair) => async (): Promise<WtpResponse> => {
        setInFlight((n) => n + 1)
        try {
          const result = await runConsideration({
            system_message: args.system_message,
            product_name: args.config.product_name,
            pair,
            features: args.config.features,
            outside_option,
          })
          return {
            pair_id: pair.pair_id,
            option_1: pair.option_1,
            option_2: pair.option_2,
            first_shown: pair.first_shown,
            claude_choice: result.choice,
            reason: result.reason,
            raw_text: result.raw_text,
            ms: result.ms,
          }
        } finally {
          setInFlight((n) => n - 1)
        }
      })

      const settled = await runWithLimit(tasks, {
        limit: CONCURRENCY_LIMIT,
        onProgress: () => setCompleted((n) => n + 1),
        shouldAbort: () => abortRef.current,
      })

      const responses: WtpResponse[] = []
      let failedCount = 0
      for (const s of settled) {
        if (s.status === 'fulfilled') {
          responses.push(s.value)
          if (s.value.claude_choice === 'parse_error') failedCount += 1
        } else {
          failedCount += 1
        }
      }
      setFailed(failedCount)

      const results = computeWtp(args.config, responses)
      const finalStatus: WtpStudy['status'] = abortRef.current ? 'cancelled' : 'complete'

      try {
        const updated = await finalizeStudy(created.id, {
          responses,
          results,
          status: finalStatus,
        })
        setStudy(updated)
        setStage('results')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save results')
        // Still show what we have, locally:
        setStudy({ ...created, responses, results, status: finalStatus })
        setStage('results')
      }
    },
    [],
  )

  const onCancel = useCallback(() => {
    abortRef.current = true
  }, [])

  if (id && existingQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">WTP Study</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulate buyers evaluating plan configurations via Claude. Estimate willingness to pay per feature.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      {stage === 'config' && <ConfigStage onRun={onRun} />}

      {stage === 'running' && study && (
        <RunnerStage
          completed={completed}
          total={study.config.responses_per_set}
          inFlight={inFlight}
          failed={failed}
          onCancel={onCancel}
        />
      )}

      {stage === 'results' && study && (
        <ResultsStage study={study} onNewStudy={resetAll} />
      )}
    </div>
  )
}
