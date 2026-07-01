// src/auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

// Normalize roles - NOW INCLUDES ADMIN
function normalizeRole(raw: string | null | undefined): 'citizen' | 'law_enforcement' | 'admin' {
  const r = (raw ?? '').trim().toLowerCase()
  if (r === 'admin') return 'admin'
  if (r === 'law_enforcement') return 'law_enforcement'
  return 'citizen'
}

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        const creds = credentials as { email?: string; password?: string }
        if (!creds?.email || !creds?.password) {
          console.log('❌ Missing credentials')
          return null
        }

        const normalizedEmail = creds.email.trim().toLowerCase()
        console.log('🔍 Looking for user:', normalizedEmail)

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .single()

        if (error || !user) {
          console.log('❌ User not found:', error?.message || 'No user')
          return null
        }

        console.log('✅ User found:', { 
          email: user.email, 
          role: user.role,
          hashExists: !!user.password_hash 
        })

        const isValidPassword = await bcrypt.compare(creds.password, user.password_hash)
        console.log('🔑 Password valid:', isValidPassword)

        if (!isValidPassword) {
          console.log('❌ Invalid password')
          return null
        }

        console.log('✅ Login successful for:', user.email)

        return {
          id:        String(user.id),
          email:     user.email,
          name:      `${user.first_name} ${user.last_name}`,
          role:      normalizeRole(user.role),
          firstName: user.first_name,
          lastName:  user.last_name,
        }
      },
    }),

    GitHub({
      clientId:     process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id        = user.id
        token.name      = user.name
        token.role      = (user as any).role
        token.firstName = (user as any).firstName
        token.lastName  = (user as any).lastName
      }

      if (account?.provider === 'github' && profile) {
        const email = (profile.email ?? '') as string
        if (email) {
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, role, first_name, last_name')
            .eq('email', email.trim().toLowerCase())
            .single()

          if (dbUser) {
            token.id        = String(dbUser.id)
            token.role      = normalizeRole(dbUser.role)
            token.firstName = dbUser.first_name
            token.lastName  = dbUser.last_name
          } else {
            token.role = 'citizen' // GitHub user not found in DB — default
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as any
        const tokenAny = token as any

        sessionUser.id        = tokenAny.id
        sessionUser.role      = tokenAny.role
        sessionUser.firstName = tokenAny.firstName
        sessionUser.lastName  = tokenAny.lastName
        sessionUser.name      = tokenAny.name as string
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      if (url.startsWith(baseUrl)) {
        return url
      }
      return `${baseUrl}/role-redirect`
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)