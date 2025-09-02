# Torrent Streets

Track visited streets in Torrent, Valencia. Next.js 15 (App Router, TS), Prisma + Vercel Postgres, Vercel Blob for photos, Tailwind + shadcn/ui, TanStack Query, react-hook-form + zod, Zustand, MapLibre + MapTiler.

## Tech
- Next.js 15 (App Router, TypeScript)
- DB: Vercel Postgres + Prisma (GeoJSON stored as JSONB)
- Files: Vercel Blob (signed upload flow)
- UI: Tailwind + shadcn/ui, TanStack Query, RHF + zod, Zustand
- Map: MapLibre GL JS (tiles via MapTiler), @turf/turf

## Setup
1. Copy `.env.example` to `.env.local` and fill values:
   - PRISMA_DATABASE_URL
   - BLOB_READ_WRITE_TOKEN
   - MAPTILER_API_KEY
   - NEXT_PUBLIC_MAPTILER_API_KEY
2. Install deps and setup DB:

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
```

3. Seed streets or import from Overpass:

```bash
pnpm import:streets
```

4. Run dev server:

```bash
pnpm dev
```

## Deploy (Vercel)
- Import this repo into Vercel
- Add Environment Variables from `.env.example`
- Add Vercel Postgres and Vercel Blob integrations
- Set Build Command: `pnpm build`, Install Command: `pnpm i --frozen-lockfile`, Output: `.next`

## Scripts
- `dev`, `build`, `lint`, `prisma:generate`, `prisma:migrate`, `seed`, `import:streets`

## Notes
- Map and heavy components are dynamically imported to reduce bundle size.
- API uses zod for input and output validation with typed responses.