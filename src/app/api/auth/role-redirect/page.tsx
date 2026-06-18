import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RoleRedirectPage() {
  const session = await auth()
  const role = (session?.user as any)?.role

  if (role === 'law_enforcement') {
    redirect('/lawenforcementdashboard')
  }
  redirect('/citizendashboard')
}