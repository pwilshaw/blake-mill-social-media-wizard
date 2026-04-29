import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Video, Upload, Trash2, ExternalLink, Sparkles, Megaphone, Loader2 } from 'lucide-react'
import {
  listVideos,
  listAdCampaigns,
  uploadVideo,
  deleteVideo,
  publishToYouTube,
} from '@/lib/videos/api'
import { VideoVariantPanel } from '@/components/videos/VideoVariantPanel'
import { PromoteAdDialog } from '@/components/videos/PromoteAdDialog'
import type { VideoUpload, YoutubeAdCampaign } from '@/lib/types'

export default function Videos() {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [promoteVideo, setPromoteVideo] = useState<VideoUpload | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const videosQuery = useQuery<VideoUpload[], Error>({
    queryKey: ['video_uploads'],
    queryFn: listVideos,
    refetchInterval: 5000,
  })

  const adCampaignsQuery = useQuery<YoutubeAdCampaign[], Error>({
    queryKey: ['youtube_ad_campaigns'],
    queryFn: listAdCampaigns,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadVideo({ file }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['video_uploads'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (v: VideoUpload) => deleteVideo(v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['video_uploads'] }),
    onError: (e: Error) => setError(e.message),
  })

  const publishMutation = useMutation({
    mutationFn: (args: { video_upload_id: string; variant_id?: string }) =>
      publishToYouTube({ ...args, privacy_status: 'public' }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['video_uploads'] })
    },
    onError: (e: Error) => setError(e.message),
  })

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    for (const f of files) uploadMutation.mutate(f)
    e.target.value = ''
  }

  const videos = videosQuery.data ?? []
  const campaigns = adCampaignsQuery.data ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Videos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload pre-made videos, generate AI title/description variants, publish to YouTube, and promote as paid YouTube ads.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploadMutation.isPending ? 'Uploading…' : 'Upload video'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          multiple
          onChange={onPick}
          className="hidden"
        />
      </header>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {videosQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Loading videos…</p>
      )}

      {!videosQuery.isLoading && videos.length === 0 && (
        <div className="rounded-md border border-dashed border-border bg-muted/20 py-16 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">No videos uploaded yet.</p>
          <p className="text-xs text-muted-foreground">
            Drop in an mp4 to get started. Up to 250 MB per file.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            video={v}
            adCampaigns={campaigns.filter((c) => c.video_upload_id === v.id)}
            onDelete={() => {
              if (window.confirm(`Delete ${v.file_name ?? 'this video'}?`)) deleteMutation.mutate(v)
            }}
            onPublish={(variant_id) => publishMutation.mutate({ video_upload_id: v.id, variant_id })}
            isPublishing={publishMutation.isPending && publishMutation.variables?.video_upload_id === v.id}
            onPromote={() => setPromoteVideo(v)}
          />
        ))}
      </div>

      {promoteVideo && (
        <PromoteAdDialog
          video={promoteVideo}
          onClose={() => setPromoteVideo(null)}
          onSubmitted={() => {
            setPromoteVideo(null)
            queryClient.invalidateQueries({ queryKey: ['youtube_ad_campaigns'] })
          }}
        />
      )}
    </div>
  )
}

interface VideoCardProps {
  video: VideoUpload
  adCampaigns: YoutubeAdCampaign[]
  onDelete: () => void
  onPublish: (variant_id?: string) => void
  isPublishing: boolean
  onPromote: () => void
}

function VideoCard({ video, adCampaigns, onDelete, onPublish, isPublishing, onPromote }: VideoCardProps) {
  const [showVariants, setShowVariants] = useState(false)

  const statusColor =
    video.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : video.status === 'publishing' ? 'bg-amber-50 text-amber-700 border-amber-200'
    : video.status === 'failed' ? 'bg-destructive/5 text-destructive border-destructive/30'
    : 'bg-muted text-muted-foreground border-border'

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="aspect-video bg-black">
        <video src={video.storage_url} controls className="h-full w-full object-contain" preload="metadata" />
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{video.file_name ?? 'Untitled video'}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatBytes(video.size_bytes)} · uploaded {new Date(video.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </p>
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
            {video.status}
          </span>
        </div>

        {video.status === 'failed' && video.status_detail && (
          <p className="text-xs text-destructive bg-destructive/5 border border-destructive/30 rounded p-2">
            {video.status_detail}
          </p>
        )}

        {video.youtube_video_id && (
          <a
            href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open on YouTube
          </a>
        )}

        {adCampaigns.length > 0 && (
          <div className="rounded-md border border-border bg-muted/20 p-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Paid campaigns</p>
            {adCampaigns.map((c) => (
              <p key={c.id} className="text-[11px]">
                <span className="font-medium">{c.status}</span>
                {c.daily_budget_micros && (
                  <span className="text-muted-foreground"> · £{(c.daily_budget_micros / 1_000_000).toFixed(2)}/day</span>
                )}
                {c.status_detail && <span className="text-destructive"> · {c.status_detail}</span>}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={() => setShowVariants((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
          >
            <Sparkles className="h-3 w-3" />
            {showVariants ? 'Hide variants' : 'Variants'}
          </button>
          <button
            type="button"
            onClick={() => onPublish()}
            disabled={isPublishing || video.status === 'published'}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {video.status === 'published' ? 'Published' : isPublishing ? 'Publishing…' : 'Publish to YouTube'}
          </button>
          <button
            type="button"
            onClick={onPromote}
            disabled={!video.youtube_video_id}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            title={video.youtube_video_id ? 'Create a paid YouTube ad' : 'Publish first, then promote'}
          >
            <Megaphone className="h-3 w-3" />
            Promote as ad
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto inline-flex items-center gap-1 text-xs text-destructive hover:underline"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>

        {showVariants && (
          <VideoVariantPanel video={video} onPickAndPublish={(variant_id) => onPublish(variant_id)} />
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
