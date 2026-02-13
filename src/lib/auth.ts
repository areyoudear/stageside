import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { createAdminClient } from "./supabase";
import bcrypt from "bcryptjs";

// Extend the default session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      username?: string | null;
      image?: string | null;
      provider?: string;
    };
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    username?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    username?: string;
    provider?: string;
    error?: string;
  }
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a password with a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user with email/password
 */
export async function createUser(
  email: string,
  password: string,
  name: string,
  username: string
): Promise<{ id: string } | null> {
  const adminClient = createAdminClient();

  // Check if email already exists
  const { data: existingEmail } = await adminClient
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existingEmail) {
    throw new Error("Email already registered");
  }

  // Check if username already exists
  const { data: existingUsername } = await adminClient
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existingUsername) {
    throw new Error("Username already taken");
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);

  const { data, error } = await adminClient
    .from("users")
    .insert({
      email,
      password_hash: passwordHash,
      display_name: name,
      username: username.toLowerCase(),
      auth_provider: "credentials",
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw new Error("Failed to create account");
  }

  return data;
}

/**
 * Find user by email for login
 */
async function findUserByEmail(email: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("users")
    .select("id, email, password_hash, display_name, username, avatar_url")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Find or create user from OAuth provider
 */
async function findOrCreateOAuthUser(
  email: string,
  name: string,
  image?: string,
  provider: string = "google"
) {
  const adminClient = createAdminClient();

  // Check if user exists
  const { data: existingUser } = await adminClient
    .from("users")
    .select("id, email, display_name, username, avatar_url")
    .eq("email", email)
    .single();

  if (existingUser) {
    // Update avatar if not set
    if (!existingUser.avatar_url && image) {
      await adminClient
        .from("users")
        .update({ avatar_url: image })
        .eq("id", existingUser.id);
    }
    return existingUser;
  }

  // Create new user from OAuth
  // Generate username from email
  const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  let username = baseUsername;
  let counter = 1;

  // Ensure unique username
  while (true) {
    const { data: existing } = await adminClient
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (!existing) break;
    username = `${baseUsername}${counter}`;
    counter++;
  }

  const { data: newUser, error } = await adminClient
    .from("users")
    .insert({
      email,
      display_name: name,
      username,
      avatar_url: image || null,
      auth_provider: provider,
      email_verified: true, // OAuth emails are verified
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id, email, display_name, username, avatar_url")
    .single();

  if (error) {
    console.error("Error creating OAuth user:", error);
    return null;
  }

  return newUser;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Email/Password authentication
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        const user = await findUserByEmail(credentials.email);

        if (!user || !user.password_hash) {
          throw new Error("No account found with this email");
        }

        const isValid = await verifyPassword(credentials.password, user.password_hash);

        if (!isValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.display_name,
          username: user.username,
          image: user.avatar_url,
        };
      },
    }),

    // Google OAuth (for login, not YouTube Music)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async signIn({ user, account }) {
      // For OAuth providers, create/find user
      if (account?.provider === "google" && user.email) {
        const dbUser = await findOrCreateOAuthUser(
          user.email,
          user.name || "",
          user.image || undefined,
          "google"
        );

        if (dbUser) {
          // Attach the database user ID
          user.id = dbUser.id;
          user.username = dbUser.username;
        }
      }

      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.userId = user.id;
        token.username = user.username || undefined;
        token.provider = account?.provider || "credentials";
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.username = token.username as string;
      session.user.provider = token.provider as string;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
    newUser: "/onboarding",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session token every 24 hours
  },

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? "__Secure-next-auth.session-token" 
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60, // 30 days - match session maxAge
      },
    },
  },

  debug: process.env.NODE_ENV === "development",
};
