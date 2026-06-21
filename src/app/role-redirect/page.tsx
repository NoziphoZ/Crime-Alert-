// src/app/role-redirect/page.tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

export default async function RoleRedirectPage() {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }
  
  const role = (session?.user as any)?.role

  if (role === 'law_enforcement') {
    redirect('/law-enforcement-dashboard')
  }
  
  redirect('/citizendashboard')
}