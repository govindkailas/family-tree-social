import { getAvatarUrl } from '@/lib/avatar'

// Mock the lastSegment function since it's internal
jest.mock('@/lib/avatar', () => ({
  ...jest.requireActual('@/lib/avatar'),
  lastSegment: jest.fn(),
}))

describe('avatar utilities', () => {
  describe('getAvatarUrl', () => {
    it('returns avatar_url if provided', () => {
      const avatarUrl = 'https://example.com/avatar.jpg'
      const socialLinks = [{ platform: 'twitter', url: 'https://twitter.com/user' }]
      expect(getAvatarUrl(avatarUrl, socialLinks)).toBe(avatarUrl)
    })

    it('returns null if no avatar_url and no social links', () => {
      expect(getAvatarUrl(null, [])).toBeNull()
      expect(getAvatarUrl(undefined, null)).toBeNull()
    })

    it('returns social avatar URL for supported platforms', () => {
      const socialLinks = [
        { platform: 'twitter', url: 'https://twitter.com/username' },
        { platform: 'instagram', url: 'https://instagram.com/username' },
        { platform: 'github', url: 'https://github.com/username' }
      ]

      expect(getAvatarUrl(null, socialLinks)).toBe('https://unavatar.io/twitter/username')
    })

    it('skips facebook platform', () => {
      const socialLinks = [
        { platform: 'facebook', url: 'https://facebook.com/username' },
        { platform: 'twitter', url: 'https://twitter.com/username' }
      ]

      expect(getAvatarUrl(null, socialLinks)).toBe('https://unavatar.io/twitter/username')
    })

    it('returns null for unsupported platforms', () => {
      const socialLinks = [
        { platform: 'custom', url: 'https://example.com' }
      ]

      expect(getAvatarUrl(null, socialLinks)).toBeNull()
    })
  })
})