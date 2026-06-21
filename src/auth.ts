// src/auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

// Normalize whatever ends up in the DB ('Citizen', ' citizen', 'LAW_ENFORCEMENT', etc.)
// into the two exact values the rest of the app checks against.
function normalizeRole(raw: string | null | undefined): 'citizen' | 'law_enforcement' {
  const r = (raw ?? '').trim().toLowerCase()
  return r === 'law_enforcement' ? 'law_enforcement' : 'citizen'
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
        if (!creds?.email || !creds?.password) return null

        const normalizedEmail = creds.email.trim().toLowerCase()

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', normalizedEmail)
          .single()

        if (error || !user) return null

        const isValidPassword = await bcrypt.compare(creds.password, user.password_hash)
        if (!isValidPassword) return null

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
      // If it's a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`
      }
      
      // If it's already absolute and matches base URL, allow it
      if (url.startsWith(baseUrl)) {
        return url
      }
      
      // Default: redirect to role-redirect page (moved to /role-redirect)
      return `${baseUrl}/role-redirect`
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)