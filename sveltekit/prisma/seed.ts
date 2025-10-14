import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    // Insert course
    const course = await prisma.course.create({
        data: {
            name: "Grundlagen",
            lessons: {
                create: [
                    { lessonName: "Einführung in KI Ethik" },
                    { lessonName: "Klare Anweisungen schreiben"},
                    { lessonName: "Referenztext bereitstellen" },
                    { lessonName: "Komplexe Aufgaben aufteilen" },
                    { lessonName: "Der KI Zeit zum Nachdenken geben" },
                  ]
                }
            }
        }
    })

    const course2 = await prisma.course.create({
      data: {
          name: "Prompt Labor",
          lessons: {
              create: [
                  { lessonName: "Grammatik-Korrektur" },
                  { lessonName: "Meeting-Notizen zusammenfassen"},
                  { lessonName: "Schlüsselwörter extrahieren" },
                  { lessonName: "Pro- und Kontra-Diskussio" },
                  { lessonName: "Übersetzung" },
                ]
              }
          }
      }
  })

    console.log("Seeded database with courses and lessons:", course)
    console.log("Seeded database with courses and lessons 2:", course2)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
