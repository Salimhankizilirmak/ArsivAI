import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'kalite@fabrika.com' },
        password: { label: 'Şifre', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Kullanıcıyı veritabanından bul
          const foundUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email))
            .limit(1);

          if (!foundUsers || foundUsers.length === 0) {
            return null;
          }

          const user = foundUsers[0];

          // Şifre kontrolü
          const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
          };
        } catch (error) {
          console.error('Next-Auth Authorize Hatası:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.tenantId = (user as any).tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tenantId = token.tenantId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 Saat oturum süresi
  },
  secret: process.env.NEXTAUTH_SECRET || 'super-secret-nextauth-key-123',
};
