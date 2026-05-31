import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { connectDB } from "./db";
import User from "@/models/User";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Please provide email and password");
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email }).select("+password");

        if (!user) {
          throw new Error("Invalid email or password");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated. Please contact admin.");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // On initial sign-in, store user data in token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
        token.lastChecked = Date.now();
        return token;
      }

      // On every subsequent request, validate user still exists in DB
      // Check every 30 seconds to avoid DB hit on every single request
      const CHECK_INTERVAL = 30 * 1000; // 30 seconds
      const now = Date.now();
      const lastChecked = (token.lastChecked as number) || 0;

      if (now - lastChecked > CHECK_INTERVAL) {
        try {
          await connectDB();
          const dbUser = await User.findById(token.id).select("isActive role avatar").lean() as any;

          // User deleted or deactivated → invalidate session
          if (!dbUser || !dbUser.isActive) {
            // Return token with deleted flag — session callback will see this
            return { ...token, deleted: true };
          }

          // Refresh role/avatar in case it changed
          token.role = dbUser.role;
          token.avatar = dbUser.avatar || token.avatar;
          token.lastChecked = now;
        } catch {
          // DB error — don't invalidate, just skip check
          token.lastChecked = now;
        }
      }

      return token;
    },
    async session({ session, token }) {
      // If user was deleted/deactivated, return null session to force logout
      if ((token as any).deleted) {
        return null as any;
      }

      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export function checkRole(userRole: string, allowedRoles: string[]) {
  return allowedRoles.includes(userRole);
}

// NOTE: Password generation is handled inline in staff/route.ts and managers/route.ts
// using: randomBytes(8).toString("base64url") + "A1!"
// The function below is kept for any future use but should not be duplicated.
// BUG-H3 FIX: Corrected slice to produce exactly `length` characters
export function generatePassword(length: number = 12): string {
  if (length < 3) throw new Error("Password length must be at least 3");
  const base = randomBytes(Math.ceil((length - 3) * 0.75))
    .toString("base64url")
    .slice(0, length - 3);
  return base + "A1!";
}
