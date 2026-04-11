// T052 — CSV survey importer with drag-and-drop, column mapping preview, and import progress
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ColumnMapping {
  csvHeader: string
  mappedField: string | null
}

interface ImportSummary {
  segments_created: number
}

const EXPECTED_FIELDS = [
  'name',
  'age',
  'dob',
  'boldness_score',
  'wear_occasions',
  'purchase_intent',
]

function parseCsvPreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split('\n').filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows = lines
    .slice(1, 4)
    .map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    )
  return { headers, rows }
}

function inferMapping(header: string): string | null {
  const lower = header.toLowerCase()
  if (lower.includes('name') || lower.includes('segment')) return 'name'
  if (lower.includes('dob') || lower.includes('birth')) return 'dob'
  if (lower.includes('age')) return 'age'
  if (lower.includes('bold') || lower.includes('style_score') || lower.includes('boldness')) return 'boldness_score'
  if (lower.includes('occasion') || lower.includes('wear')) return 'wear_occasions'
  if (lower.includes('intent') || lower.includes('purchase_intent')) return 'purchase_intent'
  return null
}

export function SurveyImporter() {
  const inputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  function handleFile(selected: File) {
    setError(null)
    setSummary(null)
    setFile(selected)
    setProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? ''
      const parsed = parseCsvPreview(text)
      setPreview(parsed)
      setMappings(
        parsed.headers.map((h) => ({ csvHeader: h, mappedField: inferMapping(h) }))
      )
    }
    reader.readAsText(selected)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.csv')) {
      handleFile(dropped)
    } else {
      setError('Only CSV files are supported.')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  function handleMappingChange(index: number, value: string) {
    setMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, mappedField: value || null } : m))
    )
  }

  async function handleImport() {
    if (!file) return
    setIsImporting(true)
    setError(null)
    setSummary(null)
    setProgress(20)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mappings', JSON.stringify(mappings))

      setProgress(50)

      const { data, error: fnError } = await supabase.functions.invoke<ImportSummary>(
        'segments/import-survey',
        { body: formData }
      )

      setProgress(100)

      if (fnError) throw new Error(fnError.message)
      setSummary(data ?? { segments_created: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
    } finally {
      setIsImporting(false)
    }
  }

  function handleReset() {
    setFile(null)
    setPreview(null)
    setMappings([])
    setSummary(null)
    setError(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Import survey data</h3>
        <p className="text-xs text-muted-foreground">
          Upload a CSV export from your survey tool. We'll map columns to segment fields automatically.
        </p>
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          aria-label="Upload CSV file"
          className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border bg-muted/20 hover:bg-muted/40'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-sm text-foreground font-medium">Drop CSV here or click to browse</p>
          <p className="text-xs text-muted-foreground">CSV files only</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleInputChange}
            aria-hidden="true"
          />
        </div>
      )}

      {/* Column mapping preview */}
      {preview && file && !summary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              Column mapping — <span className="text-muted-foreground">{file.name}</span>
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Remove file
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">CSV column</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Map to field</th>
                  {preview.rows[0]?.map((_, i) => (
                    <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Row {i + 1} preview
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.headers.map((header, hi) => (
                  <tr key={header} className="bg-background">
                    <td className="px-3 py-2 font-medium text-foreground">{header}</td>
                    <td className="px-3 py-2">
                      <select
                        value={mappings[hi]?.mappedField ?? ''}
                        onChange={(e) => handleMappingChange(hi, e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">— ignore —</option>
                        {EXPECTED_FIELDS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </td>
                    {preview.rows.map((row, ri) => (
                      <td key={ri} className="px-3 py-2 text-muted-foreground">
                        {row[hi] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Progress indicator */}
          {isImporting && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-xs text-muted-foreground">Importing… {progress}%</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing…' : 'Import CSV'}
          </button>
        </div>
      )}

      {/* Import summary */}
      {summary && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-800">Import complete</p>
          <p className="text-sm text-emerald-700">
            <span className="font-bold">{summary.segments_created}</span>{' '}
            {summary.segments_created === 1 ? 'segment' : 'segments'} created or updated.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-emerald-700 underline hover:text-emerald-900"
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  )
}
