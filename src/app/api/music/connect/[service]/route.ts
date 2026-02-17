import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// OAuth configurations for each service
const OAUTH_CONFIGS: Record<
  string,
  {
    authUrl: string;
    scopes: string[];
    clientIdEnv: string;
  }
> = {
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    scopes: [
      "user-read-email",
      "user-top-read",
      "user-read-recently-played",
      "user-follow-read",
    ],
    clientIdEnv: "SPOTIFY_CLIENT_ID",
  },
  youtube_music: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
  },
  // TODO: Add other services
};

/**
 * GET /api/music/connect/[service]
 * Initiate OAuth flow for connecting a music service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { service } = await params;
    const config = OAUTH_CONFIGS[service];

    if (!config) {
      return NextResponse.json(
        { error: "Unsupported music service" },
        { status: 400 }
      );
    }

    const clientId = process.env[config.clientIdEnv];
    if (!clientId) {
      return NextResponse.json(
        { error: "Service not configured" },
        { status: 500 }
      );
    }

    // Get callback URL from query params
    const { searchParams } = new URL(request.url);
    const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

    // Build redirect URI for our callback handler
    const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get("host")}`;
    const redirectUri = `${baseUrl}/api/music/connect/${service}/callback`;

    // Store state for security
    const state = JSON.stringify({
      userId: session.user.id,
      callbackUrl,
      timestamp: Date.now(),
    });
    const encodedState = Buffer.from(state).toString("base64");

    // Build OAuth URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: config.scopes.join(" "),
      state: encodedState,
    });

    // Spotify-specific params
    if (service === "spotify") {
      authParams.append("show_dialog", "true");
    }

    // Google-specific params
    if (service === "youtube_music") {
      authParams.append("access_type", "offline");
      authParams.append("prompt", "consent");
    }

    const authUrl = `${config.authUrl}?${authParams.toString()}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating music service OAuth:", error);
    return NextResponse.json(
      { error: "Failed to connect service" },
      { status: 500 }
    );
  }
}
