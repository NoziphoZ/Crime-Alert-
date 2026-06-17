import NextAuth, {
  type NextAuthConfig,
} from 'next-auth'

import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'

import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'Credentials',

      credentials: {
        email: {
          label: 'Email',
          type: 'email',
        },

        password: {
          label: 'Password',
          type: 'password',
        },
      },

      async authorize(credentials) {
        const creds = credentials as {
          email?: string
          password?: string
        }

        if (
          !creds?.email ||
          !creds?.password
        ) {
          return null
        }

        const normalizedEmail =
          creds.email
            .trim()
            .toLowerCase()

        const {
          data: user,
          error,
        } = await supabase
          .from('users')
          .select('*')
          .eq(
            'email',
            normalizedEmail
          )
          .single()

        if (error || !user) {
          return null
        }

        const isValidPassword =
          await bcrypt.compare(
            creds.password,
            user.password_hash
          )

        if (!isValidPassword) {
          return null
        }

        return {
          id: String(user.id),
          email: user.email,

          // Full name for dashboard
          name: `${user.first_name} ${user.last_name}`,

          role: user.role,
          firstName:
            user.first_name,
          lastName:
            user.last_name,
        }
      },
    }),

    GitHub({
      clientId:
        process.env.GITHUB_ID!,
      clientSecret:
        process.env.GITHUB_SECRET!,
    }),
  ],

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({
      token,
      user,
    }) {
      if (user) {
        token.id = user.id
        token.name = user.name

        token.role =
          (user as any).role

        token.firstName =
          (user as any)
            .firstName

        token.lastName =
          (user as any)
            .lastName
      }

      return token
    },

    async session({
      session,
      token,
    }) {
      if (session.user) {
        ;(
          session.user as any
        ).id = token.id

        session.user.name =
          token.name as string

        ;(
          session.user as any
        ).role = token.role

        ;(
          session.user as any
        ).firstName =
          token.firstName

        ;(
          session.user as any
        ).lastName =
          token.lastName
      }

      return session
    },

    async redirect({
      baseUrl,
    }) {
      return `${baseUrl}/citizendashboard`
    },
  },

  secret:
    process.env
      .NEXTAUTH_SECRET,
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig)