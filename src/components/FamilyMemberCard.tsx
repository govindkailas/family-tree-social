import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Pencil, Crown, ArrowSquareOut, Eye, DotsThree, Plus, Trash, Users } from '@phosphor-icons/react'
import { FamilyMember, SOCIAL_PLATFORMS } from '@/lib/types'

interface FamilyMemberCardProps {
  member: FamilyMember
  onEdit: () => void
  onSelect?: () => void
  onDelete?: () => void
  onAddChild?: () => void
  isHead?: boolean
  descendantCount?: number
}

export function FamilyMemberCard({ 
  member, 
  onEdit, 
  onSelect, 
  onDelete,
  onAddChild,
  isHead = false, 
  descendantCount = 0 
}: FamilyMemberCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
  }

  const getPlatformInfo = (platformName: string) => {
    return SOCIAL_PLATFORMS.find(p => p.name === platformName)
  }

  const openSocialProfile = (url: string) => {
    window.open(url, '_blank')
  }

  return (
    <Card 
      className="hover:shadow-md transition-shadow duration-200 relative cursor-pointer"
      onClick={() => onSelect?.()}
    >
      {isHead && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground p-1 rounded-full">
          <Crown className="w-4 h-4" />
        </div>
      )}
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={member.photo} alt={member.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg leading-none">{member.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {member.relationship}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {descendantCount > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Users className="w-4 h-4" />
                <span>{descendantCount}</span>
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-foreground"
                >
                  <DotsThree className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  onEdit()
                }}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Member
                </DropdownMenuItem>
                {onAddChild && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    onAddChild()
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Child
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && !isHead && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Member
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {member.bio && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {member.bio}
          </p>
        )}

        {member.email && (
          <div className="text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span className="text-foreground">{member.email}</span>
          </div>
        )}

        {member.phone && (
          <div className="text-sm">
            <span className="text-muted-foreground">Phone: </span>
            <span className="text-foreground">{member.phone}</span>
          </div>
        )}

        {member.socialProfiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Social Profiles</h4>
            <div className="flex flex-wrap gap-2">
              {member.socialProfiles.map((profile, index) => {
                const platformInfo = getPlatformInfo(profile.platform)
                return (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => openSocialProfile(profile.url)}
                    className="text-xs gap-1 h-7 px-2"
                    style={{ 
                      borderColor: platformInfo?.color,
                      color: platformInfo?.color 
                    }}
                  >
                    <span>{platformInfo?.icon}</span>
                    <span>{profile.username}</span>
                    <ArrowSquareOut className="w-3 h-3" />
                  </Button>
                )
              })}
            </div>
          </div>
        )}

        {member.socialProfiles.length === 0 && (
          <div className="text-center py-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="text-xs text-muted-foreground"
            >
              Add Social Profiles
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}