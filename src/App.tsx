import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Users, Heart, Trash } from '@phosphor-icons/react'
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
    
    // Check if member has children
    if (memberToDelete.children.length > 0) {
      toast.error('Cannot delete a member with children. Please reassign or delete their children first.')
      return
    }

    // Remove from parent's children array
    if (memberToDelete.parentId && family.members[memberToDelete.parentId]) {
      const parent = family.members[memberToDelete.parentId]
      parent.children = parent.children.filter(childId => childId !== memberId)
    }

    // Remove the member
    const { [memberId]: deleted, ...remainingMembers } = family.members
    
    setFamily({
      ...family,
      members: remainingMembers
    })

    toast.success(`Removed ${memberToDelete.name} from the family tree`)
    setShowDeleteConfirm(null)
  }

  const updateFamilyMember = (memberId: string, updates: Partial<FamilyMember>) => {
    if (!family || !family.members[memberId]) return

    const updatedFamily = {
      ...family,
      members: {
        ...family.members,
        [memberId]: {
          ...family.members[memberId],
          ...updates
        }
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
    
    // Add direct children
    member.children.forEach(childId => {
      if (family.members[childId]) {
        descendants.push(family.members[childId])
        // Recursively add their descendants
        descendants.push(...getDescendants(childId))
      }
    })
    
    return descendants
  }

  const getDisplayedMembers = () => {
    if (!family) return []
    
    if (focusedMember) {
      // Show the focused member and all their descendants
      const focused = family.members[focusedMember]
      if (focused) {
        return [focused, ...getDescendants(focusedMember)]
      }
    }
    
    // Show all members by default
    return Object.values(family.members)
  }

  if (!family) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary">
              Welcome to Family Tree
            </CardTitle>
            <p className="text-muted-foreground">
              Create your family's digital home and connect everyone's social profiles
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={createFamily} 
              className="w-full"
              size="lg"
            >
              <Users className="w-5 h-5 mr-2" />
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
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">{family.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {familyMembers.length} family member{familyMembers.length !== 1 ? 's' : ''}
                  {focusedMember && (
                    <span className="ml-2 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      Viewing: {family.members[focusedMember]?.name}'s family
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {focusedMember && (
                <Button 
                  variant="outline"
                  onClick={() => setFocusedMember(null)}
                  size="sm"
                >
                  Show All Members
                </Button>
              )}
              <Button 
                onClick={() => setShowAddMember(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {headMember && !focusedMember && (
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Family Head</h2>
            <FamilyMemberCard 
              member={headMember}
              onEdit={() => setSelectedMember(headMember.id)}
              onSelect={() => setFocusedMember(headMember.id)}
              onAddChild={() => setAddChildToMember(headMember.id)}
              isHead={true}
              descendantCount={getDescendants(headMember.id).length}
            />
          </div>
        )}

        <CollapsibleTreeView 
          family={family}
          onEditMember={(memberId) => setSelectedMember(memberId)}
          onSelectMember={(memberId) => setFocusedMember(memberId)}
        />

        {displayedMembers.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {focusedMember 
                ? `${family.members[focusedMember]?.name}'s Family` 
                : 'All Family Members'
              }
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          </div>
        )}
      </main>

      <AddMemberDialog
        open={showAddMember}
        onOpenChange={setShowAddMember}
        onAddMember={addFamilyMember}
        existingMembers={familyMembers}
      />

      {selectedMember && (
        <AddMemberDialog
          open={!!selectedMember}
          onOpenChange={() => setSelectedMember(null)}
          onAddMember={(data) => updateFamilyMember(selectedMember, data)}
          editingMember={family.members[selectedMember]}
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
            <div className="space-y-4">
              <p>
                Are you sure you want to delete <strong>{family?.members[showDeleteConfirm]?.name}</strong> from the family tree?
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteFamilyMember(showDeleteConfirm)}
                  className="gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default App