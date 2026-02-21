"use client";

/**
 * Immersive concert experience background
 * Audience POV - you can see silhouettes of people in front of you and the stage ahead
 * The crowd should be visible BEHIND the hero text content
 */
export function ConcertCrowdBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Deep dark base - gradient from stage to crowd */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />
      
      {/* Stage glow at top */}
      <div className="absolute top-0 left-0 right-0 h-[40%]">
        {/* Bright stage wash */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-500/40 via-blue-500/20 to-transparent" />
        
        {/* Stage light beams - more prominent */}
        <div 
          className="absolute top-0 left-[10%] w-[120px] h-[500px] opacity-50 animate-light-sweep origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(6, 182, 212, 0.9) 0%, rgba(6, 182, 212, 0.4) 20%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
          }}
        />
        <div 
          className="absolute top-0 left-[28%] w-[90px] h-[450px] opacity-45 animate-light-sweep-reverse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(168, 85, 247, 0.8) 0%, rgba(168, 85, 247, 0.3) 20%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-1.5s",
          }}
        />
        <div 
          className="absolute top-0 left-[50%] -translate-x-1/2 w-[140px] h-[480px] opacity-55 animate-light-pulse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 15%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
          }}
        />
        <div 
          className="absolute top-0 right-[28%] w-[90px] h-[450px] opacity-45 animate-light-sweep origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(236, 72, 153, 0.8) 0%, rgba(236, 72, 153, 0.3) 20%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-2.5s",
          }}
        />
        <div 
          className="absolute top-0 right-[10%] w-[120px] h-[500px] opacity-50 animate-light-sweep-reverse origin-top"
          style={{
            background: "linear-gradient(180deg, rgba(6, 182, 212, 0.9) 0%, rgba(6, 182, 212, 0.4) 20%, transparent 100%)",
            clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
            animationDelay: "-0.8s",
          }}
        />
        
        {/* Haze/smoke effect */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-transparent via-white/[0.08] to-transparent animate-haze" />
      </div>
      
      {/* Atmospheric glow orbs */}
      <div className="absolute top-[15%] left-1/4 w-[500px] h-[250px] bg-cyan-500/25 rounded-full blur-[120px] animate-float-slow" />
      <div className="absolute top-[20%] right-1/4 w-[400px] h-[200px] bg-blue-500/20 rounded-full blur-[100px] animate-float-slow" style={{ animationDelay: "-4s" }} />
      
      {/* CROWD SILHOUETTES - positioned to be visible behind hero text */}
      {/* The crowd takes up the bottom 60% of the hero and silhouettes start mid-way */}
      <div className="absolute bottom-0 left-0 right-0 h-[65%] pointer-events-none">
        <svg 
          className="absolute bottom-0 left-0 right-0 h-full w-full"
          viewBox="0 0 1440 600"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Very back row - tiny, transparent */}
          <g fill="#0a0a0a" opacity="0.35">
            {Array.from({ length: 90 }).map((_, i) => {
              const x = (i * 16) + Math.sin(i * 0.7) * 6;
              const height = 35 + Math.sin(i * 0.5) * 10;
              const width = 12 + Math.random() * 4;
              return (
                <ellipse
                  key={`veryback-${i}`}
                  cx={x}
                  cy={280}
                  rx={width}
                  ry={height}
                  className={i % 7 === 0 ? "animate-crowd-sway" : ""}
                />
              );
            })}
          </g>
          
          {/* Back row */}
          <g fill="#080808" opacity="0.5">
            {Array.from({ length: 70 }).map((_, i) => {
              const x = (i * 21) + Math.sin(i * 0.8) * 8;
              const height = 50 + Math.sin(i * 0.6) * 15;
              const width = 15 + Math.random() * 5;
              return (
                <ellipse
                  key={`back-${i}`}
                  cx={x}
                  cy={330}
                  rx={width}
                  ry={height}
                  className={i % 5 === 0 ? "animate-crowd-sway-alt" : ""}
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              );
            })}
          </g>
          
          {/* Middle-back row */}
          <g fill="#060606" opacity="0.65">
            {Array.from({ length: 55 }).map((_, i) => {
              const x = (i * 27) + 10 + Math.sin(i * 0.9) * 10;
              const height = 65 + Math.sin(i * 0.7) * 18;
              const width = 18 + Math.random() * 6;
              return (
                <ellipse
                  key={`midback-${i}`}
                  cx={x}
                  cy={390}
                  rx={width}
                  ry={height}
                  className={i % 4 === 0 ? "animate-crowd-sway" : ""}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              );
            })}
          </g>
          
          {/* Middle row */}
          <g fill="#040404" opacity="0.8">
            {Array.from({ length: 42 }).map((_, i) => {
              const x = (i * 35) + 12 + Math.sin(i * 1.0) * 12;
              const height = 85 + Math.sin(i * 0.6) * 22;
              const width = 22 + Math.random() * 8;
              return (
                <ellipse
                  key={`mid-${i}`}
                  cx={x}
                  cy={460}
                  rx={width}
                  ry={height}
                  className={i % 3 === 0 ? "animate-crowd-sway-alt" : ""}
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              );
            })}
          </g>
          
          {/* Front-middle row */}
          <g fill="#030303" opacity="0.9">
            {Array.from({ length: 32 }).map((_, i) => {
              const x = (i * 46) + 18 + Math.sin(i * 1.1) * 15;
              const height = 110 + Math.sin(i * 0.5) * 28;
              const width = 28 + Math.random() * 10;
              return (
                <ellipse
                  key={`frontmid-${i}`}
                  cx={x}
                  cy={530}
                  rx={width}
                  ry={height}
                  className={i % 3 === 0 ? "animate-crowd-sway" : ""}
                  style={{ animationDelay: `${i * 0.25}s` }}
                />
              );
            })}
          </g>
          
          {/* Front row - largest, darkest */}
          <g fill="#010101">
            {Array.from({ length: 22 }).map((_, i) => {
              const x = (i * 68) + 25 + Math.sin(i * 0.8) * 18;
              const height = 140 + Math.sin(i * 0.4) * 35;
              const width = 35 + Math.random() * 12;
              return (
                <ellipse
                  key={`front-${i}`}
                  cx={x}
                  cy={590}
                  rx={width}
                  ry={height}
                  className={i % 2 === 0 ? "animate-crowd-sway-alt" : ""}
                  style={{ animationDelay: `${i * 0.3}s` }}
                />
              );
            })}
          </g>
          
          {/* Raised hands/arms - animated, visible above crowd */}
          <g fill="#000">
            {[80, 200, 350, 520, 680, 850, 1020, 1180, 1320].map((x, i) => {
              const armHeight = 80 + (i % 3) * 20;
              const baseY = 350 + (i % 4) * 25;
              return (
                <g 
                  key={`arm-${i}`} 
                  className={i % 2 === 0 ? "animate-arm-pump" : "animate-arm-wave"} 
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <rect
                    x={x - 5}
                    y={baseY - armHeight}
                    width={10}
                    height={armHeight}
                    rx={5}
                    opacity={0.75}
                  />
                  <ellipse
                    cx={x}
                    cy={baseY - armHeight - 10}
                    rx={12}
                    ry={14}
                    opacity={0.75}
                  />
                </g>
              );
            })}
          </g>
          
          {/* Phone lights */}
          {[150, 340, 560, 780, 1000, 1200].map((x, i) => (
            <g key={`phone-${i}`} className="animate-phone-glow" style={{ animationDelay: `${i * 0.6}s` }}>
              <rect
                x={x}
                y={380 + (i % 3) * 35}
                width={10}
                height={16}
                rx={2}
                fill="#fff"
                opacity={0.85}
              />
              <ellipse
                cx={x + 5}
                cy={380 + (i % 3) * 35 + 8}
                rx={25}
                ry={30}
                fill="url(#phoneGlow)"
                opacity={0.4}
              />
            </g>
          ))}
          
          <defs>
            <radialGradient id="phoneGlow">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
      
      {/* Bottom gradient for content readability - subtle */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-950/90 to-transparent" />
    </div>
  );
}
