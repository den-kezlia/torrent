# Torrent Streets — Copilot Project Context

This file provides the Copilot Agent with a concise, high-signal overview of the project so future tasks can start with the right context.

## TL;DR

- Next.js 15 App Router, TypeScript
- Prisma (Postgres) with forward-only migrations
- Tailwind CSS + PostCSS (CommonJS config)
- MapLibre GL + MapTiler for maps
- Vercel Blob for photo storage
- zod for input validation
- Basic Auth middleware via env

## Core Domain

- Streets and their geometry (segments)
- Visits with status: PLANNED | IN_PROGRESS | VISITED (latest visit is authoritative)
- Notes (markdown) with optional geolocation
- Photos linked to streets (and optionally notes), geotagged via EXIF or headers

## Key Models

- Street(id, name, ...)
- StreetSegment(id, streetId, geometry Json LineString)
- Visit(id, streetId, status enum, at timestamp)
- Note(id, streetId, content markdown, optional lng/lat)
- Photo(id, streetId, noteId?, url, blobKey, optional lng/lat)

## Important Paths

- Pages:
  - /streets (list with filters, nearby search, progress)
  - /streets/[id] (detail with map, notes, gallery, uploader)
  - /map (full-screen map)
  - /streets/random (redirects to a random street)
- APIs:
  - /api/streets (list/import)
  - /api/streets/[id] (details)
  - /api/streets/[id]/notes (create)
  - /api/notes/[id]/edit (edit)
  - /api/streets/[id]/photos (upload)
  - /api/markers (bbox markers for notes+photos)

## Notable Implementation Details

- Photo upload route prefers GPS from headers `x-gps-lng/lat` and only parses EXIF if needed; uploads use Blob body.
- Client uploaders compress images to <= 3MB without cropping/resizing and preserve GPS via headers.
- Map popups include note text and optional image; link to street page and scroll to note anchor.
- Nearby streets filter uses bbox approximation over segments (no PostGIS).
- Prisma query hardening: retry wrapper + reduced concurrency; lean raw SQL for progress counts.
- Tailwind config fixed: use postcss.config.js (CJS); removed conflicting .mjs.
- Basic Auth middleware via env variables in middleware.ts; skips static/internal routes.

## UI Notes

- Dark mode supported; gray background (light) / near-black (dark).
- Thumbnails use object-contain to avoid visual cropping in grid.
- Buttons use dark backgrounds for consistency.

## Known Tradeoffs / TODOs

- No marker clustering yet.
- Nearby filter uses bbox approx; PostGIS would improve accuracy.
- Status filter implemented server-side using LATERAL join and enum::text comparison.

## Environments / Config

- Next.js config sets typedRoutes, strict mode, images remotePatterns for Vercel Blob.
- Prisma uses Postgres (optionally via Accelerate proxy from env).
- Ensure envs: database URL, BLOB_READ_WRITE_TOKEN, basic auth credentials.

## Conventions

- Use zod for route param/body validation.
- Keep migrations forward-only; avoid destructive schema changes.
- Avoid heavy concurrent Prisma queries in server components.

## Pointers to Source

- DB schema: prisma/schema.prisma
- Prisma client: src/server/db.ts
- Streets list: src/app/streets/page.tsx
- Street detail: src/app/streets/[id]/page.tsx
- Map: src/components/map/*
- Photo upload: src/app/api/streets/[id]/photos/route.ts
- Photo uploader: src/components/photos/uploader.tsx
- Notes: src/components/notes/*
- Utils: src/lib/utils.ts, src/lib/image.ts

