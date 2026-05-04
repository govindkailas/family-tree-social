'use client'
import { useRef, useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAvatarUrl } from '@/lib/avatar'

type SocialLink = { platform: string; url: string; label?: string }

interface Props {
  personId: string
  initialAvatarUrl: string | null
  socialLinks: SocialLink[]
  initials: string
  accent: string
  lightBg: string
}

// ── crop constants ────────────────────────────────────────────────────────────

const VIEWPORT = 260   // display diameter of the crop circle (px)
const OUTPUT   = 480   // exported canvas square size (px)

// ── crop helpers ──────────────────────────────────────────────────────────────

type CropState = {
  src:     string
  natW:    number
  natH:    number
  offsetX: number   // image centre offset from viewport centre
  offsetY: number
  scale:   number   // display scale
}

function minScale(natW: number, natH: number) {
  // "cover" — smaller dimension fills the viewport
  return Math.max(VIEWPORT / natW, VIEWPORT / natH)
}

function clampOffset(ox: number, oy: number, natW: number, natH: number, scale: number) {
  const half = VIEWPORT / 2
  const maxOx = (natW * scale) / 2 - half
  const maxOy = (natH * scale) / 2 - half
  return {
    ox: Math.max(-Math.max(0, maxOx), Math.min(Math.max(0, maxOx), ox)),
    oy: Math.max(-Math.max(0, maxOy), Math.min(Math.max(0, maxOy), oy)),
  }
}

// ── CropModal ─────────────────────────────────────────────────────────────────

function CropModal({
  initial,
  onConfirm,
  onCancel,
}: {
  initial: CropState
  onConfirm: (s: CropState) => void
  onCancel: () => void
}) {
  const [cs, setCs] = useState(initial)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging     = useRef(false)
  const lastMouse    = useRef({ x: 0, y: 0 })
  const lastTouch    = useRef({ x: 0, y: 0 })
  // stable refs so event handlers don't go stale
  const csRef = useRef(cs)
  csRef.current = cs

  // ── non-passive wheel + touchmove (must be DOM listeners, not React synthetic) ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function handleWheel(e: WheelEvent) {
      e.preventDefault()
      setCs(p => {
        const min  = minScale(p.natW, p.natH)
        const next = Math.min(6, Math.max(min, p.scale * (1 - e.deltaY * 0.001)))
        const { ox, oy } = clampOffset(p.offsetX, p.offsetY, p.natW, p.natH, next)
        return { ...p, scale: next, offsetX: ox, offsetY: oy }
      })
    }

    function handleTouchMove(e: TouchEvent) {
      e.preventDefault()   // stop page scroll while dragging crop
      if (!dragging.current || e.touches.length !== 1) return
      const dx = e.touches[0].clientX - lastTouch.current.x
      const dy = e.touches[0].clientY - lastTouch.current.y
      lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      setCs(p => {
        const { ox, oy } = clampOffset(p.offsetX + dx, p.offsetY + dy, p.natW, p.natH, p.scale)
        return { ...p, offsetX: ox, offsetY: oy }
      })
    }

    el.addEventListener('wheel',      handleWheel,      { passive: false })
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false })
    return () => {
      el.removeEventListener('wheel',     handleWheel)
      el.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])  // runs once — handlers read state via setCs updater fn or refs

  // ── mouse drag ──
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current  = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setCs(p => {
      const { ox, oy } = clampOffset(p.offsetX + dx, p.offsetY + dy, p.natW, p.natH, p.scale)
      return { ...p, offsetX: ox, offsetY: oy }
    })
  }
  const stopDrag = () => { dragging.current = false }

  // ── touch drag start/end (move handled by DOM listener above) ──
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    dragging.current  = true
    lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const stopTouch = () => { dragging.current = false }

  const baseScale = minScale(cs.natW, cs.natH)
  const imgLeft   = VIEWPORT / 2 - (cs.natW * cs.scale) / 2 + cs.offsetX
  const imgTop    = VIEWPORT / 2 - (cs.natH * cs.scale) / 2 + cs.offsetY

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 w-[min(340px,calc(100vw-2rem))]">
        <div className="text-center">
          <h2 className="text-sm font-semibold text-gray-800">Crop photo</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Drag to reposition · scroll or pinch to zoom</p>
        </div>

        {/* ── Crop viewport ── */}
        <div
          ref={containerRef}
          style={{
            width:       VIEWPORT,
            height:      VIEWPORT,
            borderRadius:'50%',
            overflow:    'hidden',
            position:    'relative',
            cursor:      'move',
            userSelect:  'none',
            touchAction: 'none',   // prevent browser scroll/pinch taking over
            flexShrink:  0,
            boxShadow:   '0 0 0 5px #f59e0b55, 0 0 0 9px #fef3c7, 0 4px 24px rgba(0,0,0,0.15)',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchStart={onTouchStart}
          onTouchEnd={stopTouch}
          onTouchCancel={stopTouch}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cs.src}
            alt="crop preview"
            draggable={false}
            style={{
              position:      'absolute',
              left:          imgLeft,
              top:           imgTop,
              width:         cs.natW * cs.scale,
              height:        cs.natH * cs.scale,
              userSelect:    'none',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* ── Zoom slider ── */}
        <div className="w-full flex items-center gap-2 px-1">
          <span className="text-gray-300 text-sm select-none">🔍</span>
          <input
            type="range"
            min={Math.round(baseScale * 100)}
            max={Math.round(baseScale * 600)}
            value={Math.round(cs.scale * 100)}
            step={1}
            className="flex-1 accent-amber-500"
            onChange={(e) => {
              const next = Number(e.target.value) / 100
              const { ox, oy } = clampOffset(cs.offsetX, cs.offsetY, cs.natW, cs.natH, next)
              setCs(p => ({ ...p, scale: next, offsetX: ox, offsetY: oy }))
            }}
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(cs)}
            className="flex-1 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors"
          >
            Crop &amp; Upload
          </button>
        </div>
      </div>
    </div>
  )
}

// ── canvas crop helper ────────────────────────────────────────────────────────

async function cropToBlob(cs: CropState): Promise<Blob | null> {
  const img = new Image()
  img.src = cs.src
  await new Promise<void>((res, rej) => {
    img.onload  = () => res()
    img.onerror = rej
  })

  const canvas = document.createElement('canvas')
  canvas.width  = OUTPUT
  canvas.height = OUTPUT
  const ctx = canvas.getContext('2d')!

  // Map the display-space crop to OUTPUT coordinates
  const ratio = OUTPUT / VIEWPORT
  const dW   = cs.natW * cs.scale * ratio
  const dH   = cs.natH * cs.scale * ratio
  const left = OUTPUT / 2 - (cs.natW * cs.scale) / 2 * ratio + cs.offsetX * ratio
  const top  = OUTPUT / 2 - (cs.natH * cs.scale) / 2 * ratio + cs.offsetY * ratio

  ctx.drawImage(img, left, top, dW, dH)

  return new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92))
}

// ── AvatarUploader ────────────────────────────────────────────────────────────

export default function AvatarUploader({
  personId,
  initialAvatarUrl,
  socialLinks,
  initials,
  accent,
  lightBg,
}: Props) {
  const supabase     = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(initialAvatarUrl)
  const [imgError,   setImgError]   = useState(false)
  const [isPending,  startTransition] = useTransition()
  const [status,     setStatus]     = useState<string | null>(null)
  const [cropState,  setCropState]  = useState<CropState | null>(null)

  const derivedUrl = getAvatarUrl(avatarUrl, socialLinks)
  const showImage  = !!derivedUrl && !imgError

  // ── pick file → open crop modal ──────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''   // allow re-picking the same file

    const src: string = await new Promise((res) => {
      const reader = new FileReader()
      reader.onload = (ev) => res(ev.target!.result as string)
      reader.readAsDataURL(file)
    })

    const img = new Image()
    img.src = src
    await new Promise<void>(res => { img.onload = () => res() })

    const scale = minScale(img.naturalWidth, img.naturalHeight)
    setCropState({ src, natW: img.naturalWidth, natH: img.naturalHeight, offsetX: 0, offsetY: 0, scale })
  }

  // ── crop confirmed → canvas extract → upload ──────────────────────────────

  async function handleCropConfirm(cs: CropState) {
    setCropState(null)
    setStatus('Uploading…')

    const blob = await cropToBlob(cs)
    if (!blob) { setStatus('Crop failed — please try again.'); return }

    startTransition(async () => {
      const path = `${personId}/avatar.jpg`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/jpeg' })

      if (uploadError) { setStatus(`Upload failed: ${uploadError.message}`); return }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`

      const { error: dbError } = await supabase
        .from('people')
        .update({ avatar_url: data.publicUrl })
        .eq('id', personId)

      if (dbError) { setStatus(`Save failed: ${dbError.message}`); return }

      setAvatarUrl(publicUrl)
      setImgError(false)
      setStatus(null)
    })
  }

  // ── social / remove ───────────────────────────────────────────────────────

  async function handleUseSocial() {
    setStatus('Saving…')
    startTransition(async () => {
      const { error } = await supabase.from('people').update({ avatar_url: null }).eq('id', personId)
      if (error) { setStatus(`Error: ${error.message}`); return }
      setAvatarUrl(null)
      setImgError(false)
      setStatus(null)
    })
  }

  async function handleRemove() {
    setStatus('Removing…')
    startTransition(async () => {
      const { error } = await supabase.from('people').update({ avatar_url: null }).eq('id', personId)
      if (error) { setStatus(`Error: ${error.message}`); return }
      setAvatarUrl(null)
      setImgError(true)
      setStatus(null)
    })
  }

  const hasSocialPhoto   = !!getAvatarUrl(null, socialLinks)
  const hasUploadedPhoto = !!avatarUrl && !avatarUrl.includes('unavatar')

  return (
    <>
      {cropState && (
        <CropModal
          initial={cropState}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropState(null)}
        />
      )}

      <div className="flex flex-col items-center gap-2">
        {/* Avatar circle */}
        <div className="relative group">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden"
            style={{ background: lightBg, color: accent, boxShadow: `0 0 0 3px ${accent}44` }}
          >
            {showImage ? (
              <img
                src={derivedUrl!}
                alt={initials}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            title="Upload photo"
          >
            <CameraIcon />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-2 justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="text-[11px] text-blue-500 hover:underline disabled:opacity-50"
          >
            {showImage && hasUploadedPhoto ? 'Replace photo' : 'Upload photo'}
          </button>

          {hasSocialPhoto && !hasUploadedPhoto && (
            <button
              type="button"
              onClick={handleUseSocial}
              disabled={isPending}
              className="text-[11px] text-indigo-500 hover:underline disabled:opacity-50"
            >
              Use social profile photo
            </button>
          )}

          {showImage && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="text-[11px] text-rose-400 hover:underline disabled:opacity-50"
            >
              Remove photo
            </button>
          )}
        </div>

        {status && <p className="text-[11px] text-gray-400">{status}</p>}
      </div>
    </>
  )
}

// ── icons ─────────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}
