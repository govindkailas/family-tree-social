// ── avatar utilities ─────────────────────────────────────────────────────────
//
// Priority order for displaying an avatar:
//   1. person.avatar_url  (uploaded photo stored in Supabase Storage)
//   2. Social-profile photo derived from linked accounts (see below)
//   3. Initials fallback (rendered in JSX)
//
// Platform resolution (in priority order):
//   twitter/x → unavatar.io/twitter/<handle>
//   instagram → unavatar.io/instagram/<handle>
//   github    → unavatar.io/github/<handle>
//
// Note: Facebook is intentionally excluded. Facebook blocks all unauthenticated
// profile photo requests (both the Graph API and third-party proxies return
// 400/403). Users with Facebook-only profiles should upload a photo manually.

type SocialLink = { platform: string; url: string; label?: string }

// ── helpers ──────────────────────────────────────────────────────────────────

/** Returns the last non-empty path segment of a URL, or null. */
function lastSegment(url: string): string | null {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '')
    return path.split('/').filter(Boolean).pop() ?? null
  } catch {
    return null
  }
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Given a list of social links, return the best avatar URL we can derive,
 * or null if none of the linked platforms are supported.
 */
export function getSocialAvatarUrl(socialLinks: SocialLink[] | null | undefined): string | null {
  if (!socialLinks?.length) return null

  // unavatar.io-supported platforms in priority order
  // Facebook is excluded — they block all unauthenticated photo requests
  const unavatarPlatforms: Array<[string, string]> = [
    ['twitter',   'twitter'],
    ['x',         'twitter'],   // same endpoint as twitter
    ['instagram', 'instagram'],
    ['github',    'github'],
  ]

  for (const [platform, service] of unavatarPlatforms) {
    const link = socialLinks.find((l) => l.platform === platform)
    if (!link) continue
    const handle = lastSegment(link.url)
    if (handle) return `https://unavatar.io/${service}/${handle}`
  }

  return null
}

/**
 * Returns the best avatar URL for a person — uploaded photo takes priority,
 * then social-derived, then null (caller should render initials).
 */
export function getAvatarUrl(
  avatarUrl: string | null | undefined,
  socialLinks: SocialLink[] | null | undefined
): string | null {
  return avatarUrl ?? getSocialAvatarUrl(socialLinks)
}
