import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Users, Heart, Trash, MagnifyingGlass } from '@phosphor-icons/react'
import { FamilyMemberCard } from '@/components/FamilyMemberCard'
import { AddMemberDialog } from '@/components/AddMemberDialog'
import { CollapsibleTreeView } from '@/components/CollapsibleTreeView'
import { Family, FamilyMember } from '@/lib/types'
import { toast } from 'sonner'

function App() {
  const [family, setFamily] = useKV<Family | null>('family-tree', null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [focusedMember, setFocusedMember] = useState<string | null>(null)
  const [addChildToMember, setAddChildToMember] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const createFamily = () => {
    const newFamily: Family = {
      id: Date.now().toString(),
      name: 'My Family',
      headMemberId: '',
      members: {},
      createdAt: new Date().toISOString()
    }
    setFamily(newFamily)
    setShowAddMember(true)
  }

  const addFamilyMember = (memberData: Omit<FamilyMember, 'id' | 'children'>) => {
    if (!family) return
    const newMember: FamilyMember = {
      ...memberData,
      id: Date.now().toString(),
      children: []
    }
    const updatedFamily = {
      ...family,
      members: {
        ...family.members,
        [newMember.id]: newMember
      }
    }
    if (!family.headMemberId) {
      updatedFamily.headMemberId = newMember.id
    }
    if (memberData.parentId && family.members[memberData.parentId]) {
      updatedFamily.members[memberData.parentId] = {
        ...family.members[memberData.parentId],
        children: [...family.members[memberData.parentId].children, newMember.id]
      }
    }
    setFamily(updatedFamily)
    toast.success(`Added ${newMember.name} to the family tree`)
  }

  const deleteFamilyMember = (memberId: string) => {
    if (!family || !family.members[memberId] || memberId === family.headMemberId) {
      toast.error('Cannot delete this member')
      return
    }
    const memberToDelete = family.members[memberId]
    if (memberToDelete.children.length > 0) {
      toast.error('Cannot delete a member with children. Please reassign or delete their children first.')
      return
    }
    if (memberToDelete.parentId && family.members[memberToDelete.parentId]) {
      const parent = family.members[memberToDelete.parentId]
      parent.children = parent.children.filter(childId => childId !== memberId)
    }
    const { [memberId]: deleted, ...remainingMembers } = family.members
    setFamily({ ...family, members: remainingMembers })
    toast.success(`Removed ${memberToDelete.name} from the family tree`)
    setShowDeleteConfirm(null)
  }

  const updateFamilyMember = (memberId: string, updates: Partial<FamilyMember>) => {
    if (!family || !family.members[memberId]) return
    const updatedFamily = {
      ...family,
      members: {
        ...family.members,
        [memberId]: { ...family.members[memberId], ...updates }
      }
    }
    setFamily(updatedFamily)
    toast.success('Family member updated')
  }

  const getFamilyMembers = () => {
    if (!family) return []
    return Object.values(family.members)
  }

  const getHeadMember = () => {
    if (!family || !family.headMemberId) return null
    return family.members[family.headMemberId]
  }

  const getDescendants = (memberId: string): FamilyMember[] => {
    if (!family || !family.members[memberId]) return []
    const descendants: FamilyMember[] = []
    const member = family.members[memberId]
    member.children.forEach(childId => {
      if (family.members[childId]) {
        descendants.push(family.members[childId])
        descendants.push(...getDescendants(childId))
      }
    })
    return descendants
  }

  const getDisplayedMembers = () => {
    if (!family) return []
    let members: FamilyMember[]
    if (focusedMember) {
      const focused = family.members[focusedMember]
      members = focused ? [focused, ...getDescendants(focusedMember)] : []
    } else {
      members = Object.values(family.members)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      members = members.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.relationship.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.socialProfiles.some(s => s.platform.toLowerCase().includes(q))
      )
    }
    return members
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Family Tree</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Create your family's digital home and connect everyone's social profiles</p>
            <Button onClick={createFamily} className="w-full gap-2">
              <Users size={16} />
              Create Your Family Tree
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const headMember = getHeadMember()
  const familyMembers = getFamilyMembers()
  const displayedMembers = getDisplayedMembers()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{family.name}</h1>
            <p className="text-sm text-muted-foreground">
              {familyMembers.length} family member{familyMembers.length !== 1 ? 's' : ''}
              {focusedMember && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                  Viewing: {family.members[focusedMember]?.name}'s family
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-52"
              />
            </div>
            {focusedMember && (
              <Button variant="outline" onClick={() => setFocusedMember(null)} size="sm">
                Show All Members
              </Button>
            )}
            <Button onClick={() => setShowAddMember(true)} className="gap-2">
              <Plus size={16} />
              Add Member
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {headMember && !focusedMember && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Family Head</CardTitle>
            </CardHeader>
            <CardContent>
              <FamilyMemberCard
                member={headMember}
                onEdit={() => setSelectedMember(headMember.id)}
                onSelect={() => setFocusedMember(headMember.id)}
                onAddChild={() => setAddChildToMember(headMember.id)}
                isHead={true}
                descendantCount={getDescendants(headMember.id).length}
              />
            </CardContent>
          </Card>
        )}

        <CollapsibleTreeView
          family={family}
          onEditMember={(memberId) => setSelectedMember(memberId)}
          onSelectMember={(memberId) => setFocusedMember(memberId)}
        />

        {displayedMembers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {searchQuery.trim()
                  ? `Search results for "${searchQuery}" (${displayedMembers.length})`
                  : focusedMember
                  ? `${family.members[focusedMember]?.name}'s Family`
                  : 'All Family Members'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {displayedMembers.length === 0 && searchQuery.trim() ? (
                <p className="text-center text-muted-foreground py-8">No members found matching "{searchQuery}"</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {displayedMembers.map((member) => (
                    <FamilyMemberCard
                      key={member.id}
                      member={member}
                      onEdit={() => setSelectedMember(member.id)}
                      onSelect={() => setFocusedMember(member.id)}
                      onDelete={member.id !== family.headMemberId ? () => setShowDeleteConfirm(member.id) : undefined}
                      onAddChild={() => setAddChildToMember(member.id)}
                      isHead={member.id === family.headMemberId}
                      descendantCount={getDescendants(member.id).length}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {selectedMember && (
        <AddMemberDialog
          open={!!selectedMember}
          onOpenChange={() => setSelectedMember(null)}
          onAddMember={(data) => updateFamilyMember(selectedMember, data)}
          editingMember={family.members[selectedMember]}
          existingMembers={familyMembers}
        />
      )}

      {showAddMember && (
        <AddMemberDialog
          open={showAddMember}
          onOpenChange={setShowAddMember}
          onAddMember={addFamilyMember}
          existingMembers={familyMembers}
        />
      )}

      {addChildToMember && (
        <AddMemberDialog
          open={!!addChildToMember}
          onOpenChange={() => setAddChildToMember(null)}
          onAddMember={(data) => {
            addFamilyMember({ ...data, parentId: addChildToMember })
            setAddChildToMember(null)
          }}
          existingMembers={familyMembers}
        />
      )}

      {showDeleteConfirm && (
        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Family Member</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{family?.members[showDeleteConfirm]?.name}</strong> from the family tree?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteFamilyMember(showDeleteConfirm)} className="gap-2">
                <Trash size={16} />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default App