import React, { useEffect, useRef } from 'react';

export default function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // 0.5 sets the playback speed to half-speed. 
      // You can adjust this to 0.25 (quarter speed), 0.75, etc.
      videoRef.current.playbackRate = 0.5;
    }
  }, []);

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
        backgroundColor: 'transparent',
      }}
    >
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
          opacity: 0.45, // Slightly more visible
          filter: 'contrast(1.1) brightness(0.85)',
        }}
      >
        {/* /mine-bg.mp4 points directly to frontend/public/mine-bg.mp4 */}
        <source src="/mine-bg.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Radial overlay to dim the edges and look like a tactical screen */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(7, 6, 5, 0.75) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}