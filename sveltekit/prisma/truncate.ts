import { PrismaClient } from '@prisma/client'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const prisma = new PrismaClient()

async function main() {
  const rl = createInterface({ input, output })

  try {
    const answer = await rl.question(
      'This will truncate the Course table (and dependent rows). Type YES to continue: '
    )

    if (answer.trim() !== 'YES') {
      console.log('Aborted. Nothing was truncated.')
      return
    }

    await prisma.$executeRawUnsafe('TRUNCATE TABLE "Course" RESTART IDENTITY CASCADE;')
    console.log('Course table truncated.')
  } finally {
    rl.close()
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
