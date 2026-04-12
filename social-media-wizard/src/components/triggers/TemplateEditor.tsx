// T048c — Content template editor with live preview
import { useState } from 'react'
import type { ContentTemplate, Platform } from '@/lib/types'

interface TemplateEditorProps {
  initial?: Partial<ContentTemplate>
  onSave: (data: Omit<ContentTemplate, 'id' | 'is_active' | 'created_at'>) => void
  onCancel: () => void
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
]

const STYLE_PRESETS = [
  'energetic',
  'minimal',
  'storytelling',
  'promotional',
  'lifestyle',
  'product-focus',
]

const SAMPLE_DATA = {
  shirt_name: 'The Oxford Classic',
  weather: 'sunny and 24°C',
  event: 'Glastonbury Festival',
}

function applyTemplate(template: string, data: typeof SAMPLE_DATA): string {
  return template
    .replace(/\{shirt_name\}/g, data.shirt_name)
    .replace(/\{weather\}/g, data.weather)
    .replace(/\{event\}/g, data.event)
}

export function TemplateEditor({ initial, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? 'instagram')
  const [copyTemplate, setCopyTemplate] = useState(initial?.copy_template ?? '')
  const [hashtagRaw, setHashtagRaw] = useState(
    Array.isArray(initial?.hashtag_template)
      ? initial.hashtag_template.join(' ')
      : '',
  )
  const [ctaTemplate, setCtaTemplate] = useState(initial?.cta_template ?? '')
  const [stylePreset, setStylePreset] = useState(initial?.style_preset ?? '')

  const previewCopy = applyTemplate(copyTemplate, SAMPLE_DATA)
  const previewHashtags = applyTemplate(hashtagRaw, SAMPLE_DATA)
  const previewCta = applyTemplate(ctaTemplate, SAMPLE_DATA)

  function parseHashtags(raw: string): string[] {
    return raw
      .split(/[\s,]+/)
      .map((h) => h.trim().replace(/^#/, ''))
      .filter(Boolean)
      .map((h) => `#${h}`)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    onSave({
      name,
      platform,
      copy_template: copyTemplate,
      hashtag_template: parseHashtags(hashtagRaw),
      cta_template: ctaTemplate || null,
      style_preset: stylePreset || null,
    })
  }

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
  const labelClass = 'block text-sm font-medium text-foreground mb-1'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="template-name" className={labelClass}>
            Template name
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hot weather Instagram"
            required
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="template-platform" className={labelClass}>
            Platform
          </label>
          <select
            id="template-platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className={inputClass}
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="copy-template" className={labelClass}>
            Copy template
          </label>
          <textarea
            id="copy-template"
            value={copyTemplate}
            onChange={(e) => setCopyTemplate(e.target.value)}
            rows={5}
            placeholder={`Use {shirt_name}, {weather}, or {event} as placeholders.\n\nExample:\nPerfect weather for {shirt_name}! It's {weather} outside — grab yours before they're gone.`}
            required
            className={`${inputClass} resize-y`}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Placeholders: <code className="bg-muted px-1 rounded">{'{shirt_name}'}</code>{' '}
            <code className="bg-muted px-1 rounded">{'{weather}'}</code>{' '}
            <code className="bg-muted px-1 rounded">{'{event}'}</code>
          </p>
        </div>

        <div>
          <label htmlFor="hashtag-template" className={labelClass}>
            Hashtag template
          </label>
          <input
            id="hashtag-template"
            type="text"
            value={hashtagRaw}
            onChange={(e) => setHashtagRaw(e.target.value)}
            placeholder="#summer #shirts #style"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Space or comma-separated. # prefix optional.
          </p>
        </div>

        <div>
          <label htmlFor="cta-template" className={labelClass}>
            CTA template
            <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="cta-template"
            type="text"
            value={ctaTemplate}
            onChange={(e) => setCtaTemplate(e.target.value)}
            placeholder="Shop {shirt_name} now →"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="style-preset" className={labelClass}>
            Style preset
            <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
          </label>
          <select
            id="style-preset"
            value={stylePreset}
            onChange={(e) => setStylePreset(e.target.value)}
            className={inputClass}
          >
            <option value="">None</option>
            {STYLE_PRESETS.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Save template
          </button>
        </div>
      </form>

      {/* Preview */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Preview</p>
          <p className="text-xs text-muted-foreground mb-3">
            Rendered with sample data: shirt = "{SAMPLE_DATA.shirt_name}", weather = "
            {SAMPLE_DATA.weather}", event = "{SAMPLE_DATA.event}"
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
          {/* Platform badge */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary capitalize">
              {platform}
            </span>
            {stylePreset && (
              <span className="text-xs text-muted-foreground capitalize">{stylePreset}</span>
            )}
          </div>

          {/* Copy */}
          {previewCopy ? (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {previewCopy}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Your copy will appear here…</p>
          )}

          {/* Hashtags */}
          {previewHashtags && (
            <p className="text-sm text-primary/80 font-medium break-words">{previewHashtags}</p>
          )}

          {/* CTA */}
          {previewCta && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                CTA
              </p>
              <p className="text-sm font-medium text-foreground">{previewCta}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          The AI will fill in placeholders at generation time using live campaign data.
        </p>
      </div>
    </div>
  )
}
