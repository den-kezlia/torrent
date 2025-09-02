/*
  Placeholder import script. Will fetch Overpass data for Torrent boundary and upsert Streets/StreetSegments.
  Implemented later with actual HTTP calls and normalization.
*/
import dotenv from 'dotenv'
// Prefer .env.local for local development, then fall back to .env
dotenv.config({ path: '.env.local' })
dotenv.config()
import { importStreets } from '@/server/importer'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('boundary', {
      alias: 'b',
      type: 'string',
      describe: 'Boundary name for Overpass import (e.g., "Torrent, Valencia")'
    })
    .help()
    .parseSync()

  const boundary = argv.boundary || 'Torrent, Valencia'
  console.log('Importing streets for boundary:', boundary)
  const res = await importStreets(boundary)
  console.log('Import result:', res)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
