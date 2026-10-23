// 'use client';

// import React from 'react';
// import { motion } from 'framer-motion';
// import { useRouter } from 'next/navigation';
// import dynamic from 'next/dynamic';

// import HackSingWinAnimatedTitle from './HackSingWinAnimatedTitle';

// const GradientWaves = dynamic(() => import('./GradientWaves'), {
//   ssr: false,
// });

// export default function RaceHero() {
//   const router = useRouter();
//   const [entering, setEntering] = React.useState(false);

//   // Prefetch routes on mount so navigation is instantaneous
//   React.useEffect(() => {
//     router.prefetch('/login');
//     router.prefetch('/rounds');
//   }, [router]);

//   const handleEnter = () => {
//     setEntering(true);
//     if (typeof window !== 'undefined') {
//       const token = localStorage.getItem('token');
//       if (token) {
//         router.push('/rounds');
//         return;
//       }
//     }
//     router.push('/login');
//   };

//   return (
//     <div style={styles.container}>
//       {/* 3D WebGL Gradient Waves Backdrop */}
//       <div className="absolute inset-0 z-0 pointer-events-auto">
//         <GradientWaves
//           horizonColor="#090909"
//           waveColor="#FF1744"
//           crestColor="#FFCDD2"
//           speed={0.35}
//           amplitude={2.4}
//           waveScale={0.55}
//           waveRatio={0.9}
//           swell={32}
//           turbulence={18}
//           tilt={1.12}
//           zoom={1.0}
//           height={5.4}
//           fogDepth={16}
//           detail="medium"
//           brightness={1.3}
//           opacity={1.0}
//           mouseInteraction={true}
//           parallaxStrength={0.4}
//           grain={true}
//           grainIntensity={0.03}
//         />
//       </div>

//       {/* Subtle Vignette Overlay for Crisp Text Contrast */}
//       <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-[#090909]/40 pointer-events-none z-[1]" />

//       {/* Background ambient lighting */}
//       <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none z-[1]" />

//       {/* Main Animated Fuzzy Title with Racing Entrance & Glossy Sweep */}
//       <HackSingWinAnimatedTitle size="hero" className="z-[2]" />

//       {/* Subtitle */}
//       <motion.p
//         initial={{
//           opacity: 0,
//           y: 20,
//         }}
//         animate={{
//           opacity: 1,
//           y: 0,
//         }}
//         transition={{
//           delay: 1.3,
//           duration: 0.6,
//         }}
//         style={styles.subtitle}
//       >
//         Powered by Hack Club
//       </motion.p>

//       {/* Button */}
//       <motion.button
//         onClick={handleEnter}
//         disabled={entering}
//         initial={{
//           opacity: 0,
//           y: 25,
//         }}
//         animate={{
//           opacity: 1,
//           y: 0,
//         }}
//         whileHover={
//           entering
//             ? {}
//             : {
//                 scale: 1.04,
//                 backgroundColor: 'rgba(255, 23, 68, 0.12)',
//                 boxShadow: '0 0 25px rgba(229, 57, 53, 0.4)',
//               }
//         }
//         whileTap={entering ? {} : { scale: 0.97 }}
//         transition={{
//           delay: 1.5,
//           duration: 0.5,
//         }}
//         style={{
//           ...styles.button,
//           opacity: entering ? 0.75 : 1,
//           cursor: entering ? 'wait' : 'pointer',
//         }}
//       >
//         {entering ? (
//           <span className="inline-flex items-center gap-2">
//             <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
//             <span>ENTERING ARENA...</span>
//           </span>
//         ) : (
//           'ENTER THE ARENA →'
//         )}
//       </motion.button>
//     </div>
//   );
// }

// const styles: { [key: string]: React.CSSProperties } = {
//   container: {
//     background: '#090909',
//     color: 'white',
//     width: '100vw',
//     height: '100vh',
//     overflow: 'hidden',
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     alignItems: 'center',
//     position: 'relative',
//     fontFamily: "'Space Grotesk', system-ui, sans-serif",
//   },

//   title: {
//     fontSize: 'clamp(3rem, 10vw, 6rem)',
//     fontWeight: 800,
//     letterSpacing: 0,
//     whiteSpace: 'nowrap',
//     margin: 0,
//     zIndex: 2,
//     lineHeight: 1,
//     display: 'inline-block',
//   },

//   subtitle: {
//     marginTop: '25px',
//     color: '#bdbdbd',
//     fontSize: '1.3rem',
//     letterSpacing: '3px',
//     zIndex: 2,
//   },

//   button: {
//     marginTop: '45px',
//     padding: '16px 40px',
//     border: '2px solid #ff1744',
//     background: 'transparent',
//     color: 'white',
//     fontSize: '1rem',
//     fontWeight: 600,
//     letterSpacing: '1px',
//     cursor: 'pointer',
//     borderRadius: '10px',
//     transition: 'background-color 0.2s, box-shadow 0.2s',
//     zIndex: 2,
//   },

//   sweep: {
//     position: 'absolute',
//     width: 'min(72vw, 680px)',
//     height: '1px',
//     background:
//       'linear-gradient(90deg, transparent, rgba(255,255,255,.8), transparent)',
//     top: '50%',
//     zIndex: 5,
//     pointerEvents: 'none',
//   },
// };





// 'use client';

// import React, { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';

// const geometricStyles = {
//   clipAngleTopRight: {
//     clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
//   },
//   clipAngleBottomRight: {
//     clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
//   },
//   clipButtonPrimary: {
//     clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
//   },
// };

// export default function RaceHero() {
//   const [entering, setEntering] = useState(false);
//   const [systemStatus, setSystemStatus] = useState('SYSTEM OPERATIONAL');

//   // Target Date: October 7, 2026, 15:00:00 IST (UTC+05:30)
//   const targetTime = new Date('2026-10-07T15:00:00+05:30').getTime();

//   const [timeLeft, setTimeLeft] = useState({
//     days: 0,
//     hours: 0,
//     minutes: 0,
//     seconds: 0,
//     ms: 0,
//   });

//   useEffect(() => {
//     const updateCountdown = () => {
//       const now = new Date().getTime();
//       const difference = targetTime - now;

//       if (difference > 0) {
//         const d = Math.floor(difference / (1000 * 60 * 60 * 24));
//         const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//         const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
//         const s = Math.floor((difference % (1000 * 60)) / 1000);
//         const ms = Math.floor((difference % 1000) / 10);

//         setTimeLeft({ days: d, hours: h, minutes: m, seconds: s, ms });
//       } else {
//         setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
//       }
//     };

//     updateCountdown();
//     const interval = setInterval(updateCountdown, 50);

//     return () => clearInterval(interval);
//   }, [targetTime]);

//   const handleEnter = () => {
//     setEntering(true);
//     setSystemStatus('AUTHENTICATING OPERATOR...');
//     setTimeout(() => {
//       setSystemStatus('SYNCING TELEMETRY...');
//     }, 1200);
//     setTimeout(() => {
//       setEntering(false);
//       setSystemStatus('SYSTEM OPERATIONAL');
//       alert('[SIMULATION] Connection Granted. Redirecting to Arena Rounds Portal...');
//     }, 2800);
//   };

//   return (
//     <div className="relative w-full min-h-screen bg-[#050505] text-white font-mono overflow-hidden select-none border-4 border-[#121212] flex flex-col justify-between">
      
//       {/* Background Cyber Grid Pattern */}
//       <div 
//         className="absolute inset-0 pointer-events-none opacity-20 z-0"
//         style={{
//           backgroundImage: `
//             linear-gradient(to right, rgba(255, 0, 51, 0.15) 1px, transparent 1px),
//             linear-gradient(to bottom, rgba(255, 0, 51, 0.15) 1px, transparent 1px)
//           `,
//           backgroundSize: '40px 40px'
//         }}
//       />
      
//       {/* Dynamic Red Background Ambient Glows */}
//       <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#FF0033]/15 rounded-full blur-[140px] pointer-events-none z-0" />
//       <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#800014]/20 rounded-full blur-[120px] pointer-events-none z-0" />

//       {/* Radial Overlay */}
//       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050505]/60 to-[#050505] z-[1]" />

//       {}
//       <header className="relative z-10 w-full flex justify-between items-center px-6 py-4 border-b border-[#222222] bg-[#080808]/90 backdrop-blur-md">
//         {/* Left Branding */}
//         <div className="flex items-center gap-4">
//           <div className="w-3 h-3 bg-[#FF0033] animate-pulse" />
//           <div className="flex flex-col">
//             <span className="text-xl font-black tracking-widest text-white uppercase italic font-sans">
//               HACK<span className="text-[#FF0033]">SING</span>WIN
//             </span>
//             <span className="text-[9px] text-[#888888] tracking-widest uppercase">
//               POWERED BY HACK CLUB
//             </span>
//           </div>
//         </div>

//         {/* Header Status */}
//         <div className="flex items-center gap-2 text-xs tracking-wider">
//           <span className="text-[#666]">STATUS:</span>
//           <span className="text-[#FF0033] font-bold">{systemStatus}</span>
//         </div>
//       </header>

//       {}
//       <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 lg:p-12 max-w-[1600px] mx-auto w-full my-auto items-center">
        
//         {/* ================= LEFT MAIN HERO DISPLAY (7 COLS) ================= */}
//         <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pr-0 lg:pr-6">
          
//           {/* Main Aggressive Technical Header */}
//           <motion.div 
//             initial={{ opacity: 0, y: 30 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6 }}
//             className="relative"
//           >
//             <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[0.88] text-white font-sans drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
//               DOMINATE <br />
//               <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0033] via-[#FF3355] to-white">
//                 THE CODE
//               </span> <br />
//               MATRIX.
//             </h1>
//             <p className="mt-6 text-sm sm:text-base text-[#999999] max-w-xl font-mono leading-relaxed border-l-2 border-[#FF0033] pl-4">
//               Code under pressure. Compete without compromise.
// Two teammates. One shared codebase. One objective: solve faster, outthink the competition, and claim the top spot.
//             </p>
//           </motion.div>

//           {/* Primary High-Impact CTA Block */}
//           <motion.div 
//             initial={{ opacity: 0, y: 30 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.6, delay: 0.15 }}
//             className="flex items-center pt-2"
//           >
//             <button
//               onClick={handleEnter}
//               disabled={entering}
//               style={geometricStyles.clipButtonPrimary}
//               className={`relative group w-full sm:w-auto px-10 py-5 font-black text-lg sm:text-xl tracking-widest uppercase italic transition-all duration-200 ${
//                 entering 
//                   ? 'bg-[#333] text-[#888] cursor-wait' 
//                   : 'bg-[#FF0033] text-black hover:bg-white hover:text-black shadow-[0_0_30px_rgba(255,0,51,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.8)]'
//               }`}
//             >
//               <span className="relative z-10 flex items-center justify-center gap-3">
//                 {entering ? (
//                   <>
//                     <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
//                     <span>INITIALIZING LINK...</span>
//                   </>
//                 ) : (
//                   <>
//                     <span>ENTER ARENA</span>
//                     <span className="text-2xl transition-transform group-hover:translate-x-2">→</span>
//                   </>
//                 )}
//               </span>
//               <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
//             </button>
//           </motion.div>

//         </div>

//         {/* ================= RIGHT HUD COMPACT COUNTDOWN PANEL (5 COLS) ================= */}
//         <div className="lg:col-span-5 flex flex-col justify-center">
          
//           <motion.div 
//             initial={{ opacity: 0, x: 30 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.5, delay: 0.2 }}
//             className="bg-[#0a0808] border border-[#2a1215] p-6 sm:p-8 relative overflow-hidden"
//             style={geometricStyles.clipAngleTopRight}
//           >
//             <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF0033]/5 rounded-bl-full pointer-events-none" />
            
//             <div className="flex justify-between items-center mb-6 border-b border-[#221012] pb-3">
//               <span className="text-xs font-bold tracking-widest text-[#FF0033] uppercase flex items-center gap-2">
//                 <span className="w-2 h-2 bg-[#FF0033] rounded-full animate-ping" />
//                 ARENA LAUNCH COUNTDOWN
//               </span>
//               <span className="text-[10px] text-[#666] font-mono">OCTOBER 07 // 3:00 PM IST</span>
//             </div>

//             {/* Precision Timer Display */}
//             <div className="grid grid-cols-5 gap-2 text-center font-mono my-4">
//               <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
//                 <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.days).padStart(2, '0')}</div>
//                 <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">DAYS</div>
//               </div>
//               <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
//                 <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
//                 <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">HRS</div>
//               </div>
//               <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
//                 <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
//                 <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">MINS</div>
//               </div>
//               <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
//                 <div className="text-2xl sm:text-3xl font-black text-[#FF0033]">{String(timeLeft.seconds).padStart(2, '0')}</div>
//                 <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">SECS</div>
//               </div>
//               <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
//                 <div className="text-2xl sm:text-3xl font-black text-[#888]">{String(timeLeft.ms).padStart(2, '0')}</div>
//                 <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">MS</div>
//               </div>
//             </div>

//             <div className="mt-6 pt-4 border-t border-[#1e1012] flex justify-between items-center text-[10px] text-[#666]">
//               <span>TARGET: 07-10-2026 15:00:00 IST</span>
//               <span className="text-[#FF0033] font-bold">● CLOCK SYNCHRONIZED</span>
//             </div>
//           </motion.div>

//         </div>

//       </main>

//       {}
//       <footer className="relative z-10 w-full bg-[#050505] border-t border-[#1a1a1a] px-6 py-4 flex justify-between items-center text-[10px] text-[#555]">
//         <div className="flex items-center gap-4">
//           <span className="text-white font-bold tracking-widest">HACKSINGWIN © 2026</span>
//           <span>//</span>
//           <span>ALL RIGHTS RESERVED</span>
//         </div>
//       </footer>

//     </div>
//   );
// }





'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

const geometricStyles = {
  clipAngleTopRight: {
    clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)',
  },
  clipAngleBottomRight: {
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)',
  },
  clipButtonPrimary: {
    clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
  },
};

export default function RaceHero() {
  const [entering, setEntering] = useState(false);
  const [systemStatus, setSystemStatus] = useState('SYSTEM OPERATIONAL');
  const router = useRouter();

  // Prefetch routes on mount so navigation is instantaneous
  React.useEffect(() => {
    router.prefetch('/login');
    router.prefetch('/rounds');
  }, [router]);

  // Target Date: October 7, 2026, 15:00:00 IST (UTC+05:30)
  const targetTime = new Date('2026-10-07T15:00:00+05:30').getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    ms: 0,
  });

  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference > 0) {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);
        const ms = Math.floor((difference % 1000) / 10);

        setTimeLeft({ days: d, hours: h, minutes: m, seconds: s, ms });
        setIsFinished(false);
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 });
        setIsFinished(true);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 50);

    return () => clearInterval(interval);
  }, [targetTime]);

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
    <div className="relative w-full h-screen bg-[#050505] text-white font-mono overflow-hidden select-none border-4 border-[#121212] flex flex-col">
      
      {/* Background Cyber Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 0, 51, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 0, 51, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Dynamic Red Background Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#FF0033]/15 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#800014]/20 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Radial Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-[#050505]/60 to-[#050505] z-[1]" />

      <header className="relative z-10 w-full flex justify-between items-center px-6 py-4 border-b border-[#222222] bg-[#080808]/90 backdrop-blur-md">
        {/* Left Branding */}
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#FF0033] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-widest text-white uppercase italic font-sans">
              HACK<span className="text-[#FF0033]">SING</span>WIN
            </span>
            <span className="text-[9px] text-[#888888] tracking-widest uppercase">
              POWERED BY HACK CLUB
            </span>
          </div>
        </div>

        {/* Header Status */}
        <div className="flex items-center gap-2 text-xs tracking-wider">
          <span className="text-[#666]">STATUS:</span>
          <span className="text-[#FF0033] font-bold">{systemStatus}</span>
        </div>
      </header>

      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 lg:p-12 max-w-[1600px] mx-auto w-full my-auto items-center">
        
        {/* ================= LEFT MAIN HERO DISPLAY (7 COLS) ================= */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-8 pr-0 lg:pr-6">
          
          {/* Main Aggressive Technical Header */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter uppercase italic leading-[0.88] text-white font-sans drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
              DOMINATE <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF0033] via-[#FF3355] to-white">
                THE CODE
              </span> <br />
              MATRIX.
            </h1>
            <p className="mt-6 text-sm sm:text-base text-[#999999] max-w-xl font-mono leading-relaxed border-l-2 border-[#FF0033] pl-4">
              Code under pressure. Compete without compromise.
Two teammates. One shared codebase. One objective: solve faster, outthink the competition, and claim the top spot.
            </p>
          </motion.div>

          {/* Primary High-Impact CTA Block */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex items-center pt-2"
          >
            <button
              onClick={handleEnter}
              disabled={entering}
              style={geometricStyles.clipButtonPrimary}
              className={`relative group w-full sm:w-auto px-10 py-5 font-black text-lg sm:text-xl tracking-widest uppercase italic transition-all duration-200 ${
                entering 
                  ? 'bg-[#333] text-[#888] cursor-wait' 
                  : 'bg-[#FF0033] text-black hover:bg-white hover:text-black shadow-[0_0_30px_rgba(255,0,51,0.5)] hover:shadow-[0_0_40px_rgba(255,255,255,0.8)]'
              }`}
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                {entering ? (
                  <>
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>INITIALIZING LINK...</span>
                  </>
                ) : (
                  <>
                    <span>ENTER ARENA</span>
                    <span className="text-2xl transition-transform group-hover:translate-x-2">→</span>
                  </>
                )}
              </span>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30" />
            </button>
          </motion.div>

        </div>

        {/* ================= RIGHT HUD COMPACT COUNTDOWN PANEL (5 COLS) ================= */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#0a0808] border border-[#2a1215] p-6 sm:p-8 relative overflow-hidden"
            style={geometricStyles.clipAngleTopRight}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FF0033]/5 rounded-bl-full pointer-events-none" />
            
            <div className="flex justify-between items-center mb-6 border-b border-[#221012] pb-3">
              <span className="text-xs font-bold tracking-widest text-[#FF0033] uppercase flex items-center gap-2">
                <span className="w-2 h-2 bg-[#FF0033] rounded-full animate-ping" />
                {isFinished ? 'ARENA STATUS' : 'ARENA LAUNCH COUNTDOWN'}
              </span>
              <span className="text-[10px] text-[#666] font-mono">OCTOBER 07 // 3:00 PM IST</span>
            </div>

            {/* Precision Timer Display OR Battle Begins Display */}
            {isFinished ? (
              <div className="my-4 py-6 bg-[#120809] border border-[#FF0033] flex flex-col items-center justify-center text-center shadow-[0_0_25px_rgba(255,0,51,0.2)]" style={geometricStyles.clipAngleBottomRight}>
                <span className="text-3xl sm:text-4xl font-black text-[#FF0033] tracking-widest italic animate-pulse font-sans">
                  BATTLE BEGINS
                </span>
                <span className="text-[10px] text-[#aaa] tracking-widest uppercase mt-2 font-mono">
                  THE ARENA IS NOW LIVE
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2 text-center font-mono my-4">
                <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
                  <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.days).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">DAYS</div>
                </div>
                <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
                  <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">HRS</div>
                </div>
                <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
                  <div className="text-2xl sm:text-3xl font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">MINS</div>
                </div>
                <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
                  <div className="text-2xl sm:text-3xl font-black text-[#FF0033]">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">SECS</div>
                </div>
                <div className="bg-[#120809] border border-[#331115] p-3" style={geometricStyles.clipAngleBottomRight}>
                  <div className="text-2xl sm:text-3xl font-black text-[#888]">{String(timeLeft.ms).padStart(2, '0')}</div>
                  <div className="text-[9px] text-[#777] uppercase tracking-wider mt-1">MS</div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-[#1e1012] flex justify-between items-center text-[10px] text-[#666]">
              <span>TARGET: 07-10-2026 15:00:00 IST</span>
            </div>
          </motion.div>

        </div>

      </main>

      <footer className="relative z-10 w-full bg-[#050505] border-t border-[#1a1a1a] px-6 py-4 flex justify-between items-center text-[10px] text-[#555]">
        <div className="flex items-center gap-4">
          <span className="text-white font-bold tracking-widest">HACKSINGWIN © 2026</span>
          <span>//</span>
          <span>ALL RIGHTS RESERVED</span>
        </div>
      </footer>

    </div>
  );
}