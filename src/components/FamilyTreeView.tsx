import { Family, FamilyMember } from '@/lib/types'
import { FamilyMemberCard } from './FamilyMemberCard'

interface FamilyTreeViewProps {
  family: Family
  onEditMember: (memberId: string) => void
}

export function FamilyTreeView({ family, onEditMember }: FamilyTreeViewProps) {
  const getChildrenOfMember = (memberId: string): FamilyMember[] => {
    const member = family.members[memberId]
    if (!member) return []
    
    return member.children.map(childId => family.members[childId]).filter(Boolean)
  }

  const renderMemberWithChildren = (member: FamilyMember, level = 0) => {
    const children = getChildrenOfMember(member.id)
    
    return (
      <div key={member.id} className="space-y-4">
        <div 
          className="flex justify-center"
          style={{ marginLeft: `${level * 2}rem` }}
        >
          <div className="w-full max-w-sm">
            <FamilyMemberCard
              member={member}
              onEdit={() => onEditMember(member.id)}
              isHead={member.id === family.headMemberId}
            />
          </div>
        </div>
        
        {children.length > 0 && (
          <div className="space-y-6 pl-8 border-l-2 border-muted ml-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {children.map((child) => (
                <div key={child.id} className="relative">
                  <div className="absolute -left-8 top-6 w-6 h-px bg-muted"></div>
                  <FamilyMemberCard
                    member={child}
                    onEdit={() => onEditMember(child.id)}
                  />
                  {getChildrenOfMember(child.id).length > 0 && (
                    <div className="mt-4 pl-4">
                      {renderMemberWithChildren(child, level + 1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const headMember = family.headMemberId ? family.members[family.headMemberId] : null
  const familyMembers = Object.values(family.members)

  if (!headMember) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No family head selected</p>
      </div>
    )
  }

  if (familyMembers.length === 1) {
    return null
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
          Family Tree Structure
        </h2>
        <div className="overflow-x-auto">
          {renderMemberWithChildren(headMember)}
        </div>
      </div>
    </div>
  )
}