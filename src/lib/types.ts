export interface SocialProfile {
  platform: string;
  username: string;
  url: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  photo?: string;
  email?: string;
  phone?: string;
  bio?: string;
  socialProfiles: SocialProfile[];
  parentId?: string;
  children: string[];
}

export interface Family {
  id: string;
  name: string;
  headMemberId: string;
  members: { [id: string]: FamilyMember };
  createdAt: string;
}

export const SOCIAL_PLATFORMS = [
  { name: 'Facebook', icon: '📘', color: '#1877F2' },
  { name: 'Instagram', icon: '📷', color: '#E4405F' },
  { name: 'Twitter', icon: '🐦', color: '#1DA1F2' },
  { name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { name: 'TikTok', icon: '🎵', color: '#000000' },
  { name: 'YouTube', icon: '📺', color: '#FF0000' },
  { name: 'Snapchat', icon: '👻', color: '#FFFC00' },
  { name: 'WhatsApp', icon: '💬', color: '#25D366' },
] as const;

export const RELATIONSHIP_TYPES = [
  'Parent',
  'Child', 
  'Spouse',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Aunt/Uncle',
  'Niece/Nephew',
  'Cousin',
  'In-Law'
] as const;