import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
        }}
      >
        {/* Logo/Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 40,
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            style={{ marginRight: 20 }}
          >
            <circle cx="12" cy="12" r="10" fill="#06b6d4" opacity="0.2" />
            <path
              d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"
              stroke="#06b6d4"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              fontSize: 72,
              fontWeight: 700,
              background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Stageside
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#e4e4e7",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Discover Concerts You&apos;ll Actually Love
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            color: "#71717a",
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Connect your Spotify • Find personalized concerts • Never miss your favorite artists
        </div>

        {/* Decorative elements */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            display: "flex",
            gap: 16,
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              background: "rgba(6, 182, 212, 0.1)",
              border: "1px solid rgba(6, 182, 212, 0.3)",
              borderRadius: 9999,
              color: "#06b6d4",
              fontSize: 18,
            }}
          >
            🎵 Your taste
          </div>
          <div
            style={{
              padding: "12px 24px",
              background: "rgba(59, 130, 246, 0.1)",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              borderRadius: 9999,
              color: "#3b82f6",
              fontSize: 18,
            }}
          >
            🎤 Your concerts
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
