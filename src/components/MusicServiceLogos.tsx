"use client";

/**
 * Music Service Logos
 * SVG logos for supported music streaming services
 */

interface LogoProps {
  className?: string;
  size?: number;
}

export function SpotifyLogo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function AppleMusicLogo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M23.997 6.124c0-.738-.065-1.47-.24-2.19-.317-1.31-1.062-2.31-2.18-3.043C21.003.517 20.373.285 19.7.164c-.517-.093-1.038-.135-1.564-.15-.04-.003-.083-.01-.124-.013H5.988c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208c-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.8.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81.84-.553 1.472-1.287 1.88-2.208.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.785-.49-2.1-1.36-.177-.488-.15-.99.064-1.465.31-.69.87-1.115 1.59-1.315.263-.073.532-.117.8-.168.398-.075.797-.14 1.173-.283.3-.113.47-.332.5-.663.01-.12.013-.24.013-.36V7.963c0-.17-.04-.3-.2-.37-.12-.05-.25-.08-.38-.104l-5.03-1.007c-.065-.013-.13-.027-.193-.033-.2-.02-.345.07-.4.263-.03.1-.043.21-.043.313v8.06c0 .418-.048.833-.216 1.22-.278.64-.77 1.05-1.434 1.25-.35.106-.71.17-1.078.19-.917.05-1.77-.44-2.12-1.32-.2-.503-.18-1.013.044-1.507.29-.64.793-1.072 1.458-1.305.263-.092.537-.154.81-.205.39-.072.78-.136 1.15-.275.35-.13.53-.373.545-.74.003-.065.003-.13.003-.195V5.024c0-.22.03-.436.13-.637.135-.27.368-.403.647-.417.17-.008.34.01.507.04l6.655 1.315c.27.054.53.13.772.27.36.21.547.54.57.95.006.12.003.24.003.36z" />
    </svg>
  );
}

export function YouTubeMusicLogo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
    </svg>
  );
}

export function TidalLogo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zm4.004 4.004l4.004-4.004L24.024 7.996l-4.004 4.004-4.004-4.004z" />
    </svg>
  );
}

export function DeezerLogo({ className = "", size = 24 }: LogoProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.592v3.027h5.189v-3.027h-5.19zm6.27 0v3.027h5.19v-3.027h-5.19zm6.27 0v3.027H24v-3.027h-5.19zM0 16.81v3.029h5.19v-3.03H0zm6.27 0v3.029h5.189v-3.03h-5.19zm6.27 0v3.029h5.19v-3.03h-5.19zm6.27 0v3.029H24v-3.03h-5.19z" />
    </svg>
  );
}

// Combined component showing all supported services
interface MusicServiceLogosProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
  layout?: "row" | "grid";
}

export function MusicServiceLogos({
  className = "",
  size = "md",
  showLabels = false,
  layout = "row",
}: MusicServiceLogosProps) {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };
  
  const iconSize = sizes[size];
  
  const services = [
    { Logo: SpotifyLogo, name: "Spotify", color: "text-[#1DB954]" },
    { Logo: AppleMusicLogo, name: "Apple Music", color: "text-[#FA243C]" },
    { Logo: YouTubeMusicLogo, name: "YouTube Music", color: "text-[#FF0000]" },
    { Logo: TidalLogo, name: "Tidal", color: "text-white" },
    { Logo: DeezerLogo, name: "Deezer", color: "text-[#FF0092]" },
  ];

  if (layout === "grid") {
    return (
      <div className={`grid grid-cols-5 gap-4 ${className}`}>
        {services.map(({ Logo, name, color }) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div className={`${color} opacity-80 hover:opacity-100 transition-opacity`}>
              <Logo size={iconSize} />
            </div>
            {showLabels && (
              <span className="text-xs text-gray-500">{name}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {services.map(({ Logo, name, color }) => (
        <div
          key={name}
          className={`${color} opacity-70 hover:opacity-100 transition-opacity`}
          title={name}
        >
          <Logo size={iconSize} />
        </div>
      ))}
    </div>
  );
}

// Inline version for text - "Works with [logos]"
export function MusicServiceLogosInline({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <SpotifyLogo size={14} className="text-[#1DB954]" />
      <AppleMusicLogo size={14} className="text-[#FA243C]" />
      <YouTubeMusicLogo size={14} className="text-[#FF0000]" />
      <TidalLogo size={14} className="text-white" />
      <DeezerLogo size={14} className="text-[#FF0092]" />
    </span>
  );
}
