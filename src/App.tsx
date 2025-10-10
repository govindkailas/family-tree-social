import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Users, Heart } from '@phosphor-icons/react'
import { FamilyMemberCard } from '@/components/FamilyMemberCard'
import { AddMemberDialog } from '@/components/AddMemberDialog'
import { D3TreeView } from '@/components/D3TreeView'
import { Family, FamilyMember } from '@/lib/types'
import { toast } from 'sonner'

function App() {
  const [family, setFamily] = useKV<Family | null>('family-tree', null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

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
                </p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddMember(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {headMember && (
          <div className="text-center mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Family Head</h2>
            <FamilyMemberCard 
              member={headMember}
              onEdit={() => setSelectedMember(headMember.id)}
              isHead={true}
            />
          </div>
        )}

        <D3TreeView 
          family={family}
          onEditMember={(memberId) => setSelectedMember(memberId)}
        />

        {familyMembers.length > 1 && (
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">All Family Members</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  onEdit={() => setSelectedMember(member.id)}
                  isHead={member.id === family.headMemberId}
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
    </div>
  )
}

export default App