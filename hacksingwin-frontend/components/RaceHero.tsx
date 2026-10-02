'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

import HackSingWinAnimatedTitle from './HackSingWinAnimatedTitle';

const GradientWaves = dynamic(() => import('./GradientWaves'), {
  ssr: false,
});

export default function RaceHero() {
  const router = useRouter();
  const [entering, setEntering] = React.useState(false);

  // Prefetch routes on mount so navigation is instantaneous
  React.useEffect(() => {
    router.prefetch('/login');
    router.prefetch('/rounds');
  }, [router]);

  const handleEnter = () => {
    setEntering(true);
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        router.push('/rounds');
        return;
      }
    }
    router.push('/login');
  };

  return (
    <div style={styles.container}>
      {/* 3D WebGL Gradient Waves Backdrop */}
      <div className="absolute inset-0 z-0 pointer-events-auto">
        <GradientWaves
          horizonColor="#090909"
          waveColor="#FF1744"
          crestColor="#FFCDD2"
          speed={0.35}
          amplitude={2.4}
          waveScale={0.55}
          waveRatio={0.9}
          swell={32}
          turbulence={18}
          tilt={1.12}
          zoom={1.0}
          height={5.4}
          fogDepth={16}
          detail="medium"
          brightness={1.3}
          opacity={1.0}
          mouseInteraction={true}
          parallaxStrength={0.4}
          grain={true}
          grainIntensity={0.03}
        />
      </div>

      {/* Subtle Vignette Overlay for Crisp Text Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-[#090909]/40 pointer-events-none z-[1]" />

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none z-[1]" />

      {/* Main Animated Fuzzy Title with Racing Entrance & Glossy Sweep */}
      <HackSingWinAnimatedTitle size="hero" className="z-[2]" />

      {/* Subtitle */}
      <motion.p
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          delay: 1.3,
          duration: 0.6,
        }}
        style={styles.subtitle}
      >
        Powered by Hack Club
      </motion.p>

      {/* Button */}
      <motion.button
        onClick={handleEnter}
        disabled={entering}
        initial={{
          opacity: 0,
          y: 25,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        whileHover={
          entering
            ? {}
            : {
                scale: 1.04,
                backgroundColor: 'rgba(255, 23, 68, 0.12)',
                boxShadow: '0 0 25px rgba(229, 57, 53, 0.4)',
              }
        }
        whileTap={entering ? {} : { scale: 0.97 }}
        transition={{
          delay: 1.5,
          duration: 0.5,
        }}
        style={{
          ...styles.button,
          opacity: entering ? 0.75 : 1,
          cursor: entering ? 'wait' : 'pointer',
        }}
      >
        {entering ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>ENTERING ARENA...</span>
          </span>
        ) : (
          'ENTER THE ARENA →'
        )}
      </motion.button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#090909',
    color: 'white',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
  },

  title: {
    fontSize: 'clamp(3rem, 10vw, 6rem)',
    fontWeight: 800,
    letterSpacing: 0,
    whiteSpace: 'nowrap',
    margin: 0,
    zIndex: 2,
    lineHeight: 1,
    display: 'inline-block',
  },

  subtitle: {
    marginTop: '25px',
    color: '#bdbdbd',
    fontSize: '1.3rem',
    letterSpacing: '3px',
    zIndex: 2,
  },

  button: {
    marginTop: '45px',
    padding: '16px 40px',
    border: '2px solid #ff1744',
    background: 'transparent',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 600,
    letterSpacing: '1px',
    cursor: 'pointer',
    borderRadius: '10px',
    transition: 'background-color 0.2s, box-shadow 0.2s',
    zIndex: 2,
  },

  sweep: {
    position: 'absolute',
    width: 'min(72vw, 680px)',
    height: '1px',
    background:
      'linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent)',
    top: '50%',
    zIndex: 5,
    pointerEvents: 'none',
  },
};
