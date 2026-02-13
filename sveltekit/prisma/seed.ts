import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

// recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  const filePath = path.join(__dirname, 'seed.sql')
  const sql = fs.readFileSync(filePath, 'utf8')

  const statements = sql
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }

  console.log('Seeding finished.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })