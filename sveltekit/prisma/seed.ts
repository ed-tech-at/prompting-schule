import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcrypt'
import 'dotenv/config'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

// recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function seedDevelopmentUser() {
  const email = process.env.DEV_USER_EMAIL
  const password = process.env.DEV_USER_PASSWORD

  if (!email || !password) {
    console.log('Development user skipped: DEV_USER_EMAIL and DEV_USER_PASSWORD are not set.')
    return
  }

  const pepper = process.env.SERVER_PW_PEPPER
  if (!pepper) {
    throw new Error('Development user cannot be seeded: SERVER_PW_PEPPER is not set.')
  }

  const isAdmin = process.env.DEV_USER_IS_ADMIN === '1' ? 1 : 0
  const existingUser = await prisma.user.findUnique({ where: { email } })
  const id = existingUser?.id ?? randomUUID()
  const hashedPassword = await bcrypt.hash(password + pepper + id, 10)

  await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      cryptVersion: 2,
      isAdmin,
      isDeleted: 0
    },
    create: {
      id,
      email,
      password: hashedPassword,
      cryptVersion: 2,
      isAdmin
    }
  })

  console.log(`Development user seeded: ${email}`)
}

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

  await seedDevelopmentUser()

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
