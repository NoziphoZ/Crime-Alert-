// src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcrypt";

// Extend types
declare module "next-auth" {
  interface User {
    role?: string;
    first_name?: string;
    last_name?: string;
  }
  
  interface Session {
    user: User & {
      role?: string;
      first_name?: string;
      last_name?: string;
    }
  }
}

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Fix: Use type assertion
        const email = (credentials?.email as string) || '';
        const password = (credentials?.password as string) || '';
        
        if (!email || !password) {
          return null;
        }

        try {
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase().trim())
            .single();

          if (error || !user) {
            return null;
          }

          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.first_name = user.first_name;
        token.last_name = user.last_name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.first_name = token.first_name as string;
        session.user.last_name = token.last_name as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };