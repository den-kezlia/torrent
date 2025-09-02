import { prisma } from '@/server/db'

async function main() {
  if ((await prisma.street.count()) === 0) {
    await prisma.street.create({
      data: { name: 'Placeholder Street', osmId: 'seed-osm-1' }
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
