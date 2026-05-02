# Family Tree Web App

A clean, interactive family tree application that lets family members connect and explore their lineage. Members can link social profiles (Facebook, Instagram, LinkedIn, Twitter/X, custom URLs), and the app is invite‑only with magic‑link authentication.

## Tech Stack

- **Next.js 14** (App Router, Tailwind CSS)
- **Supabase** (PostgreSQL, Auth, RLS, Storage)
- **React Flow** (interactive family tree graph)
- **shadcn/ui** (beautiful components)
- **Vercel** (free deployment)

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd family-tree-app
npm install
```

### 2. Set up Supabase
Go to supabase.com and create a project.

In the SQL editor, paste and run the entire supabase-schema.sql file.

Enable Email Auth with Magic Link (and optionally Google).

Set your site URL under Authentication → URL Configuration (e.g., http://localhost:3000 for development, your Vercel domain for production).

### 3. Environment Variables
Copy the file .env.local and replace with your Supabase project URL and anon key:

``` text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run
bash
npm run dev
Open http://localhost:3000

### Features
- 🔐 Magic‑link login (email)

- 👨‍👩‍👧‍👦 Invite‑only family network

- 🌳 Interactive family tree (parent/child + spouse relationships)

- 🔍 Search by name or nickname

- 🔗 Social profiles (Facebook, Instagram, LinkedIn, Twitter, custom)

- ✏️ Add/edit people and relationships

- 📱 Fully responsive, minimal design

### Deploy to Vercel
Push your code to a GitHub repository.

Import the project into Vercel.

Add the two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

Deploy!

### License
MIT
EOF