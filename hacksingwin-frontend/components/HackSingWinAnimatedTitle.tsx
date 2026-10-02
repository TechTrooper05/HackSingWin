'use client';

import React from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

const FuzzyText = dynamic(() => import('./FuzzyText'), {
  ssr: false,
});

export interface HackSingWinAnimatedTitleProps {
  size?: 'hero' | 'presentation' | 'modal' | 'nav';
  className?: string;
  showSweep?: boolean;
  enableFuzzy?: boolean;
  enableHover?: boolean;
  clickEffect?: boolean;
  glitchMode?: boolean;
  fuzzRange?: number;
  baseIntensity?: number;
  hoverIntensity?: number;
}

export default function HackSingWinAnimatedTitle({
  size = 'nav',
  className = '',
  showSweep = true,
  enableFuzzy = true,
  enableHover = true,
  clickEffect,
  glitchMode,
  fuzzRange,
  baseIntensity,
  hoverIntensity,
}: HackSingWinAnimatedTitleProps) {
  // Typography & effect styling presets per variant
  const sizeStyles = {
    hero: {
      fontSize: 'clamp(3rem, 10vw, 6rem)',
      fontWeight: 800,
      startX: -2200,
      initialBlur: 'blur(16px)',
      midBlur: 'blur(3px)',
      duration: 1.75,
      sweepDelay: 1.82,
      sweepHeight: '2px',
      sweepWidth: 'min(72vw, 680px)',
      fuzzRange: 24,
      baseIntensity: 0.12,
      hoverIntensity: 0.45,
      glitchMode: true,
      glitchInterval: 3200,
      glitchDuration: 180,
      clickEffect: true,
    },
    presentation: {
      fontSize: 'clamp(1.75rem, 4vw, 3rem)',
      fontWeight: 800,
      startX: -1200,
      initialBlur: 'blur(12px)',
      midBlur: 'blur(2px)',
      duration: 1.6,
      sweepDelay: 1.65,
      sweepHeight: '1.5px',
      sweepWidth: '100%',
      fuzzRange: 16,
      baseIntensity: 0.11,
      hoverIntensity: 0.4,
      glitchMode: true,
      glitchInterval: 4000,
      glitchDuration: 150,
      clickEffect: true,
    },
    modal: {
      fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)',
      fontWeight: 800,
      startX: -800,
      initialBlur: 'blur(10px)',
      midBlur: 'blur(2px)',
      duration: 1.5,
      sweepDelay: 1.55,
      sweepHeight: '1px',
      sweepWidth: '100%',
      fuzzRange: 12,
      baseIntensity: 0.09,
      hoverIntensity: 0.35,
      glitchMode: false,
      glitchInterval: 5000,
      glitchDuration: 150,
      clickEffect: true,
    },
    nav: {
      fontSize: '1.125rem',
      fontWeight: 800,
      startX: -350,
      initialBlur: 'blur(6px)',
      midBlur: 'blur(1px)',
      duration: 1.35,
      sweepDelay: 1.4,
      sweepHeight: '1px',
      sweepWidth: '100%',
      fuzzRange: 7,
      baseIntensity: 0.07,
      hoverIntensity: 0.3,
      glitchMode: false,
      glitchInterval: 6000,
      glitchDuration: 120,
      clickEffect: true,
    },
  }[size];

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center overflow-hidden select-none ${className}`}
      style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
    >
      <motion.div
        initial={{
          x: sizeStyles.startX,
          scaleX: 1.08,
          opacity: 1,
          filter: sizeStyles.initialBlur,
        }}
        animate={{
          x: [sizeStyles.startX, 6, 0],
          scaleX: 1,
          filter: [sizeStyles.initialBlur, sizeStyles.midBlur, 'blur(0px)'],
        }}
        transition={{
          duration: sizeStyles.duration,
          times: [0, 0.9, 1],
          ease: [0.16, 1, 0.3, 1],
        }}
        style={{
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {enableFuzzy ? (
          <FuzzyText
            fontSize={sizeStyles.fontSize}
            fontWeight={sizeStyles.fontWeight}
            fontFamily="'Space Grotesk', system-ui, sans-serif"
            fuzzRange={fuzzRange ?? sizeStyles.fuzzRange}
            baseIntensity={baseIntensity ?? sizeStyles.baseIntensity}
            hoverIntensity={hoverIntensity ?? sizeStyles.hoverIntensity}
            enableHover={enableHover}
            clickEffect={clickEffect ?? sizeStyles.clickEffect}
            glitchMode={glitchMode ?? sizeStyles.glitchMode}
            glitchInterval={sizeStyles.glitchInterval}
            glitchDuration={sizeStyles.glitchDuration}
          >
            <span style={{ color: '#FFFFFF' }}>HACKSING</span>
            <span style={{ color: '#E53935' }}>WIN</span>
          </FuzzyText>
        ) : (
          <h1
            style={{
              fontSize: sizeStyles.fontSize,
              fontWeight: sizeStyles.fontWeight,
              letterSpacing: size === 'nav' ? '0.5px' : '0px',
              whiteSpace: 'nowrap',
              margin: 0,
              lineHeight: 1.1,
              display: 'inline-block',
            }}
          >
            <span style={{ color: '#FFFFFF' }}>HACKSING</span>
            <span style={{ color: '#E53935' }}>WIN</span>
          </h1>
        )}
      </motion.div>

      {/* Glossy sweep highlight */}
      {showSweep && (
        <motion.div
          style={{
            position: 'absolute',
            width: sizeStyles.sweepWidth,
            height: sizeStyles.sweepHeight,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
            top: '50%',
            zIndex: 5,
            pointerEvents: 'none',
          }}
          initial={{ x: '-120%', opacity: 0 }}
          animate={{ x: '120%', opacity: [0, 0.8, 0] }}
          transition={{
            delay: sizeStyles.sweepDelay,
            duration: 0.65,
            ease: 'easeInOut',
          }}
        />
      )}
    </div>
  );
}
