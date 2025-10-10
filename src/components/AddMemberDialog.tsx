import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash, X } from '@phosphor-icons/react'
import { FamilyMember, SocialProfile, RELATIONSHIP_TYPES, SOCIAL_PLATFORMS } from '@/lib/types'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddMember: (member: Omit<FamilyMember, 'id' | 'children'>) => void
  editingMember?: FamilyMember
  existingMembers: FamilyMember[]
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
      setFormData({
        name: '',
        relationship: '',
        parentId: '',
        email: '',
        phone: '',
        bio: '',
        photo: ''
      })
      setSocialProfiles([])
    }
  }, [editingMember, open])

  const addSocialProfile = () => {
    setSocialProfiles([...socialProfiles, { platform: '', username: '', url: '' }])
  }

  const updateSocialProfile = (index: number, field: keyof SocialProfile, value: string) => {
    const updated = [...socialProfiles]
    updated[index] = { ...updated[index], [field]: value }
    
    if (field === 'platform' && value) {
      const platform = SOCIAL_PLATFORMS.find(p => p.name === value)
      if (platform) {
        updated[index].url = getDefaultUrl(value, updated[index].username)
      }
    }
    
    if (field === 'username' && updated[index].platform) {
      updated[index].url = getDefaultUrl(updated[index].platform, value)
    }
    
    setSocialProfiles(updated)
  }

  const removeSocialProfile = (index: number) => {
    setSocialProfiles(socialProfiles.filter((_, i) => i !== index))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) return

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

  const potentialParents = existingMembers.filter(member => 
    !editingMember || member.id !== editingMember.id
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="relationship">Relationship</Label>
              <Select 
                value={formData.relationship} 
                onValueChange={(value) => setFormData({ ...formData, relationship: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {potentialParents.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent/Guardian</Label>
                <Select 
                  value={formData.parentId} 
                  onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {potentialParents.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">Photo URL</Label>
              <Input
                id="photo"
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>

          <div className="space-y-2">
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
                <Button 
                  type="button" 
                  onClick={addSocialProfile}
                  size="sm"
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {socialProfiles.map((profile, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-lg">
                  <Select 
                    value={profile.platform} 
                    onValueChange={(value) => updateSocialProfile(index, 'platform', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Platform" />
                    </SelectTrigger>
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
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeSocialProfile(index)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              {socialProfiles.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="mb-3">No social profiles added yet</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addSocialProfile}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
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
            <Button type="submit">
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}