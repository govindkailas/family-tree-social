# Family Tree Social Network

A digital platform where families can create visual family trees and connect their social media profiles for easy discovery and connection among family members.

**Experience Qualities**:
1. **Warm** - Creates a sense of belonging and familial connection through gentle, inviting design
2. **Intuitive** - Family members of all ages can easily navigate and add their information
3. **Connected** - Emphasizes relationships and makes social profile sharing seamless

**Complexity Level**: Light Application (multiple features with basic state)
- Manages family member data, relationships, and social profiles with straightforward CRUD operations and visual tree representation

## Essential Features

**Family Tree Creation**
- Functionality: Create and manage hierarchical family structures with multiple generations
- Purpose: Provides visual organization of family relationships and heritage
- Trigger: Family head/parent creates initial family tree structure
- Progression: Create family → Add family head → Invite members → Members add their details → Tree displays relationships
- Success criteria: Clear visual hierarchy showing family relationships with expandable generations

**Social Profile Linking**
- Functionality: Family members can add and link their social media profiles (Facebook, Instagram, Twitter, LinkedIn, TikTok, etc.)
- Purpose: Enables easy discovery and connection across social platforms within the family
- Trigger: Family member clicks "Add Social Profile" on their profile
- Progression: Select platform → Enter profile URL/username → Validate link → Display on family member card
- Success criteria: Social icons display correctly and links open to actual profiles

**Family Member Management**
- Functionality: Add, edit, and organize family members with photos, basic info, and relationships
- Purpose: Maintains up-to-date family directory with personal information
- Trigger: Family head or authorized members add new family members
- Progression: Click "Add Member" → Enter details (name, relationship, photo) → Set permissions → Save → Member appears in tree
- Success criteria: All family members display with correct relationships and information

**Profile Discovery**
- Functionality: Browse family member profiles and quickly access their social media accounts
- Purpose: Facilitates connection and communication among family members
- Trigger: Click on any family member in the tree
- Progression: Select family member → View profile card → Click social media icons → Navigate to external profiles
- Success criteria: Quick access to all family members' social profiles with working external links

## Edge Case Handling
- **Missing Social Profiles**: Display placeholder with "Add Profile" prompt for incomplete profiles
- **Invalid Social Links**: Validate URLs and show error messages for broken or incorrect links
- **Large Families**: Implement collapsible tree branches and search functionality for families with many members
- **Permission Conflicts**: Clear hierarchy where family head has admin rights, members can only edit their own profiles
- **Duplicate Members**: Prevent duplicate entries with name/email matching and confirmation prompts

## Design Direction
The design should feel warm and familial like a digital photo album, with a clean, organized interface that emphasizes relationships and connectivity over complexity.

## Color Selection
Complementary (opposite colors) - Using warm earth tones with cool accent colors to create a balanced, familial feeling that's both grounding and refreshing.

- **Primary Color**: Warm Terracotta `oklch(0.65 0.15 45)` - Communicates warmth, family bonds, and earthiness
- **Secondary Colors**: Soft Cream `oklch(0.95 0.02 75)` for backgrounds and Muted Sage `oklch(0.75 0.08 150)` for supporting elements
- **Accent Color**: Cool Teal `oklch(0.55 0.12 195)` - Attention-grabbing highlight for social links and interactive elements
- **Foreground/Background Pairings**: 
  - Background (Soft Cream `oklch(0.95 0.02 75)`): Dark Charcoal text `oklch(0.25 0.02 45)` - Ratio 12.1:1 ✓
  - Primary (Warm Terracotta `oklch(0.65 0.15 45)`): White text `oklch(1 0 0)` - Ratio 4.9:1 ✓
  - Secondary (Muted Sage `oklch(0.75 0.08 150)`): Dark Charcoal text `oklch(0.25 0.02 45)` - Ratio 7.8:1 ✓
  - Accent (Cool Teal `oklch(0.55 0.12 195)`): White text `oklch(1 0 0)` - Ratio 5.2:1 ✓

## Font Selection
Typography should feel approachable and family-friendly, using Poppins for its warmth and readability across generations.

- **Typographic Hierarchy**:
  - H1 (Family Name): Poppins Bold/32px/tight letter spacing
  - H2 (Section Headers): Poppins Semibold/24px/normal spacing
  - H3 (Member Names): Poppins Medium/18px/normal spacing
  - Body (Descriptions): Poppins Regular/16px/relaxed line height
  - Small (Social Labels): Poppins Medium/14px/normal spacing

## Animations
Subtle and meaningful animations that guide family connections and celebrate relationships, with gentle transitions that feel organic rather than mechanical.

- **Purposeful Meaning**: Tree branch expansions and social profile reveals should feel like opening a family photo album - gradual and anticipatory
- **Hierarchy of Movement**: Family member cards get priority animation focus, followed by social profile interactions, with navigation elements having minimal but smooth transitions

## Component Selection
- **Components**: 
  - Cards for family member profiles with hover states and social icon overlays
  - Avatar components for profile photos with fallback initials
  - Buttons for social platform links with recognizable platform colors
  - Dialog for adding/editing family member information
  - Breadcrumb navigation for large family trees
  - Badges for relationship labels (Parent, Child, Spouse, etc.)

- **Customizations**: 
  - D3.js-powered tidy tree visualization with SVG rendering for scalable family hierarchy
  - Interactive node-based family member cards with click-to-edit functionality
  - Social platform icon component library with brand-appropriate styling
  - Relationship connector lines with responsive positioning using D3 link generators

- **States**: 
  - Family member cards: default, hover (lift shadow), selected (border highlight), editing (form overlay)
  - Social buttons: default (platform colors), hover (slight scale), active (pressed state)
  - Add member buttons: prominent when empty, subtle when populated

- **Icon Selection**: 
  - Plus icon for adding family members and social profiles
  - Users icon for family management
  - Link icon for external social profile connections
  - Heart icon for family relationships and connections

- **Spacing**: 
  - Consistent 4-unit (16px) spacing between family member cards
  - 2-unit (8px) spacing for social profile icons
  - 6-unit (24px) margins around major sections

- **Mobile**: 
  - D3 tree view remains interactive on mobile with touch support and scroll/pan capabilities
  - Social profile icons remain visible as small numbered badges within tree nodes
  - Touch-friendly tree navigation with zoom and pan gestures
  - Responsive SVG scaling maintains tree readability across all screen sizes