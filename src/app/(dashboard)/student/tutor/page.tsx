import { Metadata } from 'next'
import { requireUser } from '@/server/actions/auth'
import { db, subjects } from '@/lib/db'
import { TutorChat } from '@/components/student/tutor-chat'

export const metadata: Metadata = { title: 'Tutor IA Jurídico' }

export default async function TutorPage() {
  const user = await requireUser()
  const allSubjects = await db.select({
    id: subjects.id,
    name: subjects.name,
  }).from(subjects)

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Tutor IA Jurídico</h1>
        <p className="text-gray-500 mt-1">
          Tire dúvidas jurídicas com inteligência artificial baseada na legislação vigente
        </p>
      </div>
      <div className="flex-1 min-h-0">
        <TutorChat user={user} subjects={allSubjects} />
      </div>
    </div>
  )
}
