import { useEffect, useRef } from 'react';

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Slow down playback speed to half-speed for a smooth cinematic effect
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

  // Generate 45 random dust particles to float in space
  const particles = Array.from({ length: 45 }).map((_, i) => {
    const left = Math.random() * 100; // %
    const delay = Math.random() * 16; // seconds delay
    const duration = 12 + Math.random() * 15; // slow floating speed
    const size = 3 + Math.random() * 5; // pixel diameter (made larger for visibility)
    return { id: i, left, delay, duration, size };
  });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        backgroundColor: '#060505', // Deep rich mining theme dark background
      }}
    >
      {/* Styles for dynamic flowing dust and sweeping neon lines */}
      <style>{`
        @keyframes dust-float {
          0% { transform: translateY(105vh) translateX(0) scale(0.8); opacity: 0; }
          15% { opacity: 0.65; }
          85% { opacity: 0.65; }
          100% { transform: translateY(-5vh) translateX(60px) scale(1.3); opacity: 0; }
        }
        
        /* Clear horizontal sweeps that run across the viewport */
        @keyframes sweep-purple {
          0% { left: -15%; opacity: 0; }
          10% { opacity: 0.45; }
          50% { opacity: 0.6; }
          90% { opacity: 0.45; }
          100% { left: 115%; opacity: 0; }
        }
        @keyframes sweep-blue {
          0% { left: -25%; opacity: 0; }
          15% { opacity: 0.4; }
          50% { opacity: 0.55; }
          85% { opacity: 0.4; }
          100% { left: 125%; opacity: 0; }
        }
        @keyframes sweep-red {
          0% { left: 115%; opacity: 0; }
          15% { opacity: 0.3; }
          50% { opacity: 0.45; }
          85% { opacity: 0.3; }
          100% { left: -25%; opacity: 0; }
        }
        
        .dust-particle {
          position: absolute;
          background: rgba(243, 237, 228, 0.75); /* warm golden dust tint */
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(243, 237, 228, 0.5), 0 0 20px rgba(255, 90, 31, 0.2);
          animation: dust-float infinite linear;
        }
        
        .shining-line {
          position: absolute;
          width: 5px;
          height: 200vh;
          filter: blur(2px);
          pointer-events: none;
        }
      `}</style>

      {/* Cinematic Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.28,
          filter: 'contrast(1.15) brightness(0.7) grayscale(0.2)',
        }}
      >
        <source src="/mine-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* SHINING NEON LIGHTING SCANNER LINES (Purple, Blue, Red) */}
      <div
        className="shining-line"
        style={{
          top: '-50vh',
          transform: 'rotate(30deg)',
          background: 'linear-gradient(to bottom, transparent, rgba(168, 85, 247, 0.65), transparent)',
          boxShadow: '0 0 35px rgba(168, 85, 247, 0.9), 0 0 70px rgba(168, 85, 247, 0.5)',
          animation: 'sweep-purple 22s linear infinite',
        }}
      />
      <div
        className="shining-line"
        style={{
          top: '-50vh',
          transform: 'rotate(-25deg)',
          background: 'linear-gradient(to bottom, transparent, rgba(0, 204, 255, 0.6), transparent)',
          boxShadow: '0 0 35px rgba(0, 204, 255, 0.9), 0 0 70px rgba(0, 204, 255, 0.5)',
          animation: 'sweep-blue 26s linear infinite',
        }}
      />
      <div
        className="shining-line"
        style={{
          top: '-50vh',
          transform: 'rotate(15deg)',
          background: 'linear-gradient(to bottom, transparent, rgba(239, 68, 68, 0.5), transparent)',
          boxShadow: '0 0 35px rgba(239, 68, 68, 0.85), 0 0 70px rgba(239, 68, 68, 0.45)',
          animation: 'sweep-red 30s linear infinite',
        }}
      />

      {/* FLOWING DUST PARTICLES */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="dust-particle"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Dark Tactical Screen Radial Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, transparent 10%, rgba(6, 5, 5, 0.82) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}