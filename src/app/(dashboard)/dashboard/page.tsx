import { redirect } from 'next/navigation'
import { requireUser } from '@/server/actions/auth'

export default async function DashboardPage() {
  const user = await requireUser()

  if (user.role === 'super_admin' || user.role === 'admin') {
    redirect('/admin/dashboard')
  }

  redirect('/student/dashboard')
}
