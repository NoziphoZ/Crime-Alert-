import NextAuth, {
  type NextAuthConfig,
} from 'next-auth'

import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'

import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

export const authConfig: NextAuthConfig =
  {
    providers: [
      // EMAIL + PASSWORD LOGIN
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

        async authorize(
          credentials
        ) {
          const creds =
            credentials as {
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

          // FIND USER
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

          // CHECK PASSWORD
          const isValidPassword =
            await bcrypt.compare(
              creds.password,
              user.password_hash
            )

          if (
            !isValidPassword
          ) {
            return null
          }

          // RETURN USER
          return {
            id: String(user.id),
            email: user.email,
            role: user.role,
            firstName:
              user.first_name,
            lastName:
              user.last_name,
          }
        },
      }),

      // GITHUB LOGIN
      GitHub({
        clientId:
          process.env
            .GITHUB_ID!,
        clientSecret:
          process.env
            .GITHUB_SECRET!,
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
          token.role =
            (
              user as any
            ).role
          token.firstName =
            (
              user as any
            ).firstName
          token.lastName =
            (
              user as any
            ).lastName
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

          ;(
            session.user as any
          ).role =
            token.role

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
        return `${baseUrl}/citizen-dashboard`
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