import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { supabase } from "@/lib/supabase"
import bcrypt from "bcrypt"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null
        }

        const normalizedEmail = credentials.email.trim().toLowerCase()

        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", normalizedEmail)
          .single()

        if (error || !user) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password_hash
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.first_name,
          lastName: user.last_name,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
          firstName: (user as any).firstName,
          lastName: (user as any).lastName,
        }
      }

      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...(session.user as any),
          id: token.id,
          role: token.role,
          firstName: token.firstName,
          lastName: token.lastName,
        },
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
