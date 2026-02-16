"use client";

/**
 * Immersive concert experience background
 * Audience POV - you can see silhouettes of people in front of you and the stage ahead
 */
export function ConcertCrowdBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Deep dark base - gradient from stage to crowd */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      
      {/* Stage glow at top */}
      <div className="absolute top-0 left-0 right-0 h-[35%]">
        {/* Bright stage wash */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-cyan-500/30 via-purple-500/20 to-transparent" />
        
        {/* Stage light beams */}
        <div 
          className="absolute top-0 left-[15%] w-[100px] h-[400px] opacity-40 animate-light-sweep origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.3) 30%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
          }}
        />
        <div 
          className="absolute top-0 left-[30%] w-[80px] h-[350px] opacity-35 animate-light-sweep-reverse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(168, 85, 247, 0.7) 0%, rgba(168, 85, 247, 0.2) 30%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-1.5s",
          }}
        />
        <div 
          className="absolute top-0 left-[50%] -translate-x-1/2 w-[120px] h-[380px] opacity-50 animate-light-pulse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 20%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
          }}
        />
        <div 
          className="absolute top-0 right-[30%] w-[80px] h-[350px] opacity-35 animate-light-sweep origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(236, 72, 153, 0.7) 0%, rgba(236, 72, 153, 0.2) 30%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-2.5s",
          }}
        />
        <div 
          className="absolute top-0 right-[15%] w-[100px] h-[400px] opacity-40 animate-light-sweep-reverse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(6, 182, 212, 0.8) 0%, rgba(6, 182, 212, 0.3) 30%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-0.8s",
          }}
        />
        
        {/* Haze/smoke effect */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-transparent via-white/5 to-transparent animate-haze" />
      </div>
      
      {/* Atmospheric glow orbs */}
      <div className="absolute top-[20%] left-1/4 w-[400px] h-[200px] bg-cyan-500/20 rounded-full blur-[100px] animate-float-slow" />
      <div className="absolute top-[25%] right-1/4 w-[300px] h-[150px] bg-purple-500/15 rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: "-4s" }} />
      
      {/* CROWD SILHOUETTES - More prominent */}
      <div className="absolute bottom-0 left-0 right-0 h-[50%] pointer-events-none">
        <svg 
          className="absolute bottom-0 left-0 right-0 h-full w-full"
          viewBox="0 0 1440 500"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Back row - smallest silhouettes */}
          <g fill="#000" opacity="0.5">
            {Array.from({ length: 70 }).map((_, i) => {
              const x = (i * 21) + Math.sin(i * 0.7) * 8;
              const height = 50 + Math.sin(i * 0.5) * 15;
              const width = 15 + Math.random() * 6;
              const shouldAnimate = i % 5 === 0;
              return (
                <ellipse
                  key={`back-${i}`}
                  cx={x}
                  cy={250}
                  rx={width}
                  ry={height}
                  className={shouldAnimate ? "animate-crowd-sway" : ""}
                  style={shouldAnimate ? { animationDelay: `${i * 0.1}s` } : undefined}
                />
              );
            })}
          </g>
          
          {/* Middle-back row */}
          <g fill="#050505" opacity="0.65">
            {Array.from({ length: 55 }).map((_, i) => {
              const x = (i * 27) + 10 + Math.sin(i * 0.8) * 10;
              const height = 65 + Math.sin(i * 0.6) * 18;
              const width = 18 + Math.random() * 7;
              const shouldAnimate = i % 4 === 0;
              return (
                <ellipse
                  key={`midback-${i}`}
                  cx={x}
                  cy={300}
                  rx={width}
                  ry={height}
                  className={shouldAnimate ? "animate-crowd-sway-alt" : ""}
                  style={shouldAnimate ? { animationDelay: `${i * 0.15}s` } : undefined}
                />
              );
            })}
          </g>
          
          {/* Middle row */}
          <g fill="#080808" opacity="0.8">
            {Array.from({ length: 40 }).map((_, i) => {
              const x = (i * 36) + 15 + Math.sin(i * 0.9) * 12;
              const height = 80 + Math.sin(i * 0.7) * 20;
              const width = 22 + Math.random() * 8;
              const shouldAnimate = i % 3 === 0;
              return (
                <ellipse
                  key={`mid-${i}`}
                  cx={x}
                  cy={360}
                  rx={width}
                  ry={height}
                  className={shouldAnimate ? "animate-crowd-sway" : ""}
                  style={shouldAnimate ? { animationDelay: `${i * 0.2}s` } : undefined}
                />
              );
            })}
          </g>
          
          {/* Front-middle row */}
          <g fill="#0a0a0a" opacity="0.9">
            {Array.from({ length: 30 }).map((_, i) => {
              const x = (i * 50) + 20 + Math.sin(i * 1.1) * 15;
              const height = 100 + Math.sin(i * 0.5) * 25;
              const width = 26 + Math.random() * 10;
              const shouldAnimate = i % 3 === 0;
              return (
                <ellipse
                  key={`frontmid-${i}`}
                  cx={x}
                  cy={420}
                  rx={width}
                  ry={height}
                  className={shouldAnimate ? "animate-crowd-sway-alt" : ""}
                  style={shouldAnimate ? { animationDelay: `${i * 0.25}s` } : undefined}
                />
              );
            })}
          </g>
          
          {/* Front row - largest, clearest silhouettes */}
          <g fill="#030303">
            {Array.from({ length: 20 }).map((_, i) => {
              const x = (i * 75) + 30 + Math.sin(i * 0.8) * 20;
              const height = 130 + Math.sin(i * 0.4) * 30;
              const width = 32 + Math.random() * 12;
              const shouldAnimate = i % 2 === 0;
              return (
                <ellipse
                  key={`front-${i}`}
                  cx={x}
                  cy={480}
                  rx={width}
                  ry={height}
                  className={shouldAnimate ? "animate-crowd-sway" : ""}
                  style={shouldAnimate ? { animationDelay: `${i * 0.3}s` } : undefined}
                />
              );
            })}
          </g>
          
          {/* Raised hands/arms */}
          <g fill="#000">
            {[100, 250, 400, 580, 720, 900, 1050, 1200, 1350].map((x, i) => {
              const armHeight = 70 + (i % 3) * 15;
              const baseY = 280 + (i % 4) * 30;
              return (
                <g key={`arm-${i}`} className={i % 2 === 0 ? "animate-arm-pump" : "animate-arm-wave"} style={{ animationDelay: `${i * 0.15}s` }}>
                  {/* Arm */}
                  <rect
                    x={x - 4}
                    y={baseY - armHeight}
                    width={8}
                    height={armHeight}
                    rx={4}
                    opacity={0.7 + (i % 3) * 0.1}
                  />
                  {/* Hand */}
                  <ellipse
                    cx={x}
                    cy={baseY - armHeight - 8}
                    rx={10}
                    ry={12}
                    opacity={0.7 + (i % 3) * 0.1}
                  />
                </g>
              );
            })}
          </g>
          
          {/* Phone lights in crowd */}
          {[180, 380, 620, 850, 1100, 1280].map((x, i) => (
            <g key={`phone-${i}`} className="animate-phone-glow" style={{ animationDelay: `${i * 0.7}s` }}>
              <rect
                x={x}
                y={320 + (i % 3) * 40}
                width={8}
                height={14}
                rx={2}
                fill="#fff"
                opacity={0.8}
              />
              {/* Phone glow */}
              <ellipse
                cx={x + 4}
                cy={320 + (i % 3) * 40 + 7}
                rx={20}
                ry={25}
                fill="#fff"
                opacity={0.15}
                className="blur-sm"
              />
            </g>
          ))}
        </svg>
      </div>
      
      {/* Bottom gradient to blend into content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent" />
    </div>
  );
}
