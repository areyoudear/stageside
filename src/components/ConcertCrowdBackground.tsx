"use client";

/**
 * Immersive concert experience background
 * Audience POV - you can see silhouettes of people in front of you and the stage ahead
 */
export function ConcertCrowdBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Deep dark base */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900 to-gray-800" />
      
      {/* Stage area at the top - bright lights */}
      <div className="absolute top-0 left-0 right-0 h-[40%]">
        {/* Stage platform glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-gradient-to-t from-cyan-500/20 to-transparent blur-xl" />
        
        {/* Main stage lights - animated beams */}
        <div className="absolute top-0 left-[20%] w-4 h-[300px] bg-gradient-to-b from-cyan-400/60 via-cyan-500/30 to-transparent blur-sm animate-light-sweep origin-top" />
        <div className="absolute top-0 left-[35%] w-3 h-[280px] bg-gradient-to-b from-purple-400/50 via-purple-500/20 to-transparent blur-sm animate-light-sweep-reverse origin-top" style={{ animationDelay: "-1s" }} />
        <div className="absolute top-0 left-[50%] w-5 h-[320px] bg-gradient-to-b from-white/40 via-cyan-300/20 to-transparent blur-sm animate-light-pulse origin-top" />
        <div className="absolute top-0 left-[65%] w-3 h-[280px] bg-gradient-to-b from-pink-400/50 via-pink-500/20 to-transparent blur-sm animate-light-sweep origin-top" style={{ animationDelay: "-2s" }} />
        <div className="absolute top-0 left-[80%] w-4 h-[300px] bg-gradient-to-b from-cyan-400/60 via-cyan-500/30 to-transparent blur-sm animate-light-sweep-reverse origin-top" style={{ animationDelay: "-0.5s" }} />
        
        {/* Laser effects */}
        <div className="absolute top-10 left-[25%] w-[1px] h-[200px] bg-gradient-to-b from-cyan-400/80 to-transparent animate-laser-left origin-top" />
        <div className="absolute top-10 right-[25%] w-[1px] h-[200px] bg-gradient-to-b from-pink-400/80 to-transparent animate-laser-right origin-top" />
        
        {/* Stage haze/fog effect */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-transparent via-cyan-500/10 to-transparent animate-haze" />
      </div>
      
      {/* Atmospheric fog/haze in middle */}
      <div className="absolute top-[30%] left-0 right-0 h-[30%]">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[200px] bg-cyan-500/10 rounded-full blur-[80px] animate-float-slow" />
        <div className="absolute top-10 right-1/4 w-[400px] h-[150px] bg-purple-500/10 rounded-full blur-[60px] animate-float-slow" style={{ animationDelay: "-3s" }} />
      </div>
      
      {/* Crowd silhouettes - layered for depth */}
      <svg 
        className="absolute bottom-0 left-0 right-0 h-[45%]"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYMax slice"
      >
        <defs>
          {/* Gradient for depth */}
          <linearGradient id="crowdGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        
        {/* Far back row - smallest, most transparent */}
        <g fill="#000" opacity="0.4">
          {Array.from({ length: 80 }).map((_, i) => {
            const x = (i * 18) + Math.sin(i * 0.7) * 5;
            const height = 35 + Math.sin(i * 0.5) * 8 + Math.random() * 10;
            const width = 12 + Math.random() * 4;
            return (
              <ellipse
                key={`far-${i}`}
                cx={x}
                cy={180}
                rx={width}
                ry={height}
                className={i % 7 === 0 ? "animate-crowd-sway" : i % 5 === 0 ? "animate-crowd-sway-alt" : ""}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            );
          })}
        </g>
        
        {/* Middle back row */}
        <g fill="#000" opacity="0.55">
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (i * 24) + 6 + Math.sin(i * 0.8) * 8;
            const height = 45 + Math.sin(i * 0.6) * 10 + Math.random() * 12;
            const width = 14 + Math.random() * 5;
            return (
              <ellipse
                key={`midback-${i}`}
                cx={x}
                cy={220}
                rx={width}
                ry={height}
                className={i % 6 === 0 ? "animate-crowd-sway" : i % 4 === 0 ? "animate-crowd-sway-alt" : ""}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            );
          })}
        </g>
        
        {/* Middle row */}
        <g fill="#000" opacity="0.7">
          {Array.from({ length: 45 }).map((_, i) => {
            const x = (i * 32) + 10 + Math.sin(i * 0.9) * 10;
            const height = 55 + Math.sin(i * 0.7) * 12 + Math.random() * 15;
            const width = 16 + Math.random() * 6;
            return (
              <ellipse
                key={`mid-${i}`}
                cx={x}
                cy={270}
                rx={width}
                ry={height}
                className={i % 5 === 0 ? "animate-crowd-sway" : i % 3 === 0 ? "animate-crowd-sway-alt" : ""}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            );
          })}
        </g>
        
        {/* Front-middle row */}
        <g fill="#000" opacity="0.85">
          {Array.from({ length: 35 }).map((_, i) => {
            const x = (i * 42) + 15 + Math.sin(i * 1.1) * 12;
            const height = 70 + Math.sin(i * 0.5) * 15 + Math.random() * 18;
            const width = 18 + Math.random() * 7;
            return (
              <ellipse
                key={`frontmid-${i}`}
                cx={x}
                cy={330}
                rx={width}
                ry={height}
                className={i % 4 === 0 ? "animate-crowd-sway" : i % 3 === 0 ? "animate-crowd-sway-alt" : ""}
                style={{ animationDelay: `${i * 0.25}s` }}
              />
            );
          })}
        </g>
        
        {/* Front row - largest, darkest */}
        <g fill="#0a0a0a" opacity="0.95">
          {Array.from({ length: 25 }).map((_, i) => {
            const x = (i * 60) + 20 + Math.sin(i * 0.8) * 15;
            const height = 90 + Math.sin(i * 0.4) * 20 + Math.random() * 25;
            const width = 22 + Math.random() * 10;
            return (
              <ellipse
                key={`front-${i}`}
                cx={x}
                cy={380}
                rx={width}
                ry={height}
                className={i % 3 === 0 ? "animate-crowd-sway" : i % 2 === 0 ? "animate-crowd-sway-alt" : ""}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            );
          })}
        </g>
        
        {/* Raised hands/arms - animated */}
        <g fill="#000" opacity="0.8">
          {[80, 180, 320, 480, 620, 780, 920, 1080, 1200, 1350].map((x, i) => (
            <g key={`hand-${i}`}>
              {/* Arm */}
              <rect
                x={x - 3}
                y={200 + (i % 3) * 20}
                width={6}
                height={80 - (i % 3) * 10}
                rx={3}
                className={i % 2 === 0 ? "animate-arm-pump" : "animate-arm-wave"}
                style={{ 
                  transformOrigin: `${x}px ${280 + (i % 3) * 20}px`,
                  animationDelay: `${i * 0.2}s` 
                }}
              />
              {/* Hand */}
              <ellipse
                cx={x}
                cy={195 + (i % 3) * 20}
                rx={8}
                ry={10}
                className={i % 2 === 0 ? "animate-arm-pump" : "animate-arm-wave"}
                style={{ 
                  transformOrigin: `${x}px ${280 + (i % 3) * 20}px`,
                  animationDelay: `${i * 0.2}s` 
                }}
              />
            </g>
          ))}
        </g>
        
        {/* Phone lights in crowd */}
        {[150, 350, 550, 750, 950, 1150, 1300].map((x, i) => (
          <rect
            key={`phone-${i}`}
            x={x}
            y={250 + (i % 4) * 30}
            width={6}
            height={10}
            rx={1}
            fill="#fff"
            opacity={0.6}
            className="animate-phone-glow"
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </svg>
      
      {/* Bottom fade to ensure text readability */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent" />
    </div>
  );
}
