import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash, WarningCircle } from '@phosphor-icons/react'
import { FamilyMember, SocialProfile, RELATIONSHIP_TYPES, SOCIAL_PLATFORMS } from '@/lib/types'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMember: (member: Omit<FamilyMember, 'id' | 'children'>) => void
  editingMember?: FamilyMember
  existingMembers: FamilyMember[]
}

function isValidUrl(url: string): boolean {
  if (!url) return true // empty is OK (optional)
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onAddMember,
  editingMember,
  existingMembers
}: AddMemberDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    parentId: '',
    email: '',
    phone: '',
    bio: '',
    photo: ''
  })
  const [socialProfiles, setSocialProfiles] = useState<SocialProfile[]>([])
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [urlErrors, setUrlErrors] = useState<Record<number, string>>({})

  useEffect(() => {
    if (editingMember) {
      setFormData({
        name: editingMember.name,
        relationship: editingMember.relationship,
        parentId: editingMember.parentId || '',
        email: editingMember.email || '',
        phone: editingMember.phone || '',
        bio: editingMember.bio || '',
        photo: editingMember.photo || ''
      })
      setSocialProfiles(editingMember.socialProfiles || [])
    } else {
      setFormData({ name: '', relationship: '', parentId: '', email: '', phone: '', bio: '', photo: '' })
      setSocialProfiles([])
    }
    setDuplicateWarning(null)
    setUrlErrors({})
  }, [editingMember, open])

  // Check for duplicate names as user types
  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value })
    if (value.trim()) {
      const duplicate = existingMembers.find(
        m =>
          m.name.toLowerCase().trim() === value.toLowerCase().trim() &&
          (!editingMember || m.id !== editingMember.id)
      )
      if (duplicate) {
        setDuplicateWarning(`A member named "${duplicate.name}" already exists. Please confirm this is a different person.`)
      } else {
        setDuplicateWarning(null)
      }
    } else {
      setDuplicateWarning(null)
    }
  }

  const addSocialProfile = () => {
    setSocialProfiles([...socialProfiles, { platform: '', username: '', url: '' }])
  }

  const updateSocialProfile = (index: number, field: keyof SocialProfile, value: string) => {
    const updated = [...socialProfiles]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'platform' && value) {
      updated[index].url = getDefaultUrl(value, updated[index].username)
    }
    if (field === 'username' && updated[index].platform) {
      updated[index].url = getDefaultUrl(updated[index].platform, value)
    }
    // Validate URL on change
    if (field === 'url') {
      const errors = { ...urlErrors }
      if (value && !isValidUrl(value)) {
        errors[index] = 'Please enter a valid URL starting with http:// or https://'
      } else {
        delete errors[index]
      }
      setUrlErrors(errors)
    }
    setSocialProfiles(updated)
  }

  const removeSocialProfile = (index: number) => {
    setSocialProfiles(socialProfiles.filter((_, i) => i !== index))
    const errors = { ...urlErrors }
    delete errors[index]
    setUrlErrors(errors)
  }

  const getDefaultUrl = (platform: string, username: string) => {
    if (!username) return ''
    const urlMappings: { [key: string]: string } = {
      'Facebook': `https://facebook.com/${username}`,
      'Instagram': `https://instagram.com/${username}`,
      'Twitter': `https://twitter.com/${username}`,
      'LinkedIn': `https://linkedin.com/in/${username}`,
      'TikTok': `https://tiktok.com/@${username}`,
      'YouTube': `https://youtube.com/@${username}`,
      'Snapchat': `https://snapchat.com/add/${username}`,
      'WhatsApp': `https://wa.me/${username}`
    }
    return urlMappings[platform] || ''
  }

  const hasUrlErrors = Object.keys(urlErrors).length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (hasUrlErrors) return

    // Final URL validation pass before submitting
    const invalidProfiles = socialProfiles.filter(
      (p, i) => p.url && !isValidUrl(p.url)
    )
    if (invalidProfiles.length > 0) return

    const validProfiles = socialProfiles.filter(
      profile => profile.platform && profile.username && profile.url
    )
    onAddMember({
      ...formData,
      socialProfiles: validProfiles,
      parentId: formData.parentId || undefined
    })
    onOpenChange(false)
  }

  const potentialParents = existingMembers.filter(
    member => !editingMember || member.id !== editingMember.id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingMember ? 'Edit Family Member' : 'Add Family Member'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter full name"
                required
              />
              {duplicateWarning && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                  <WarningCircle size={14} />
                  <span>{duplicateWarning}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Relationship</Label>
              <Select value={formData.relationship} onValueChange={(value) => setFormData({ ...formData, relationship: value })}>
                <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {potentialParents.length > 0 && (
              <div className="space-y-1.5">
                <Label>Parent/Guardian</Label>
                <Select
                  value={formData.parentId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, parentId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {potentialParents.map((member) => (
                      <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="photo">Photo URL</Label>
              <Input
                id="photo"
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about this family member..."
              rows={3}
            />
          </div>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Social Profiles</CardTitle>
                <Button type="button" onClick={addSocialProfile} size="sm" className="gap-1">
                  <Plus size={16} />
                  Add Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialProfiles.map((profile, index) => (
                <div key={index} className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-lg">
                    <Select
                      value={profile.platform}
                      onValueChange={(value) => updateSocialProfile(index, 'platform', value)}
                    >
                      <SelectTrigger><SelectValue placeholder="Platform" /></SelectTrigger>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <SelectItem key={platform.name} value={platform.name}>
                            {platform.icon} {platform.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={profile.username}
                      onChange={(e) => updateSocialProfile(index, 'username', e.target.value)}
                      placeholder="Username"
                    />
                    <Input
                      value={profile.url}
                      onChange={(e) => updateSocialProfile(index, 'url', e.target.value)}
                      placeholder="Profile URL"
                      className={urlErrors[index] ? 'border-destructive' : ''}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSocialProfile(index)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                  {urlErrors[index] && (
                    <p className="flex items-center gap-1.5 text-xs text-destructive px-3">
                      <WarningCircle size={12} />
                      {urlErrors[index]}
                    </p>
                  )}
                </div>
              ))}
              {socialProfiles.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="mb-3">No social profiles added yet</p>
                  <Button type="button" variant="outline" onClick={addSocialProfile} className="gap-2">
                    <Plus size={16} />
                    Add First Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={hasUrlErrors}>
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}