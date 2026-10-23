// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { io } from 'socket.io-client';
// import {
//   Shield,
//   Lock,
//   ArrowRight,
//   Clock,
//   CheckCircle2,
//   MapPin,
//   LogOut,
//   Code2,
//   Layers,
// } from 'lucide-react';
// import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

// interface ProblemSummary {
//   id: string;
//   title: string;
//   slug: string;
//   difficulty: string;
//   timeLimitMs: number;
// }

// interface ContestRound {
//   id: number;
//   title: string;
//   description: string | null;
//   status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
//   durationMin: number;
//   problems: ProblemSummary[];
// }

// export default function RoundsPage() {
//   const router = useRouter();
//   const [rounds, setRounds] = useState<ContestRound[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState<{ username: string; teamName: string; teamCode: string; seatSide: string } | null>(null);

//   const fetchRounds = async () => {
//     try {
//       const res = await axios.get('http://localhost:4000/api/rounds');
//       setRounds(res.data.rounds || []);
//     } catch (err) {
//       console.error('Error fetching rounds:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     const username = localStorage.getItem('username');
//     const teamName = localStorage.getItem('teamName') || 'Your Team';
//     const teamCode = localStorage.getItem('teamCode') || 'CODE';
//     const seatSide = localStorage.getItem('seatSide') || 'LEFT';

//     if (!token) {
//       router.push('/login');
//       return;
//     }

//     setUser({ username: username || '', teamName, teamCode, seatSide });
//     fetchRounds();

//     // Listen for real-time round status changes from admin
//     const socket = io('http://localhost:4000', {
//       auth: { token },
//       transports: ['websocket', 'polling'],
//     });

//     socket.on('ROUND_STATUS_CHANGED', () => {
//       fetchRounds();
//     });

//     return () => {
//       socket.disconnect();
//     };
//   }, [router]);

//   const handleLogout = () => {
//     localStorage.clear();
//     router.push('/login');
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center font-sans">
//         <div className="flex items-center gap-3">
//           <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
//           <span className="font-mono text-sm text-zinc-400">Loading contest stages...</span>
//         </div>
//       </div>
//     );
//   }

//   const isLeftWing = user?.seatSide === 'LEFT';

//   return (
//     <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
//       {/* Header */}
//       <header className="h-16 border-b border-zinc-800 bg-[#141414] px-8 flex items-center justify-between">
//         <div className="flex items-center gap-4">
//           <div className="w-9 h-9 bg-red-950/70 border border-red-800 text-red-500 rounded-xl flex items-center justify-center font-bold">
//             <Shield className="w-5 h-5" />
//           </div>
//           <div className="flex items-center gap-2">
//             <HackSingWinAnimatedTitle size="nav" />
//             <span className="text-[10px] bg-red-900/60 border border-red-700 text-red-300 px-2 py-0.5 rounded-full font-mono">
//               CONTEST ARENA
//             </span>
//           </div>
//         </div>

//         <div className="flex items-center gap-4">
//           {/* Seating Wing Badge */}
//           <span
//             className={`text-xs px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
//               isLeftWing
//                 ? 'bg-blue-950/80 border-blue-600 text-blue-300'
//                 : 'bg-purple-950/80 border-purple-600 text-purple-300'
//             }`}
//           >
//             <MapPin className="w-3.5 h-3.5" />
//             <span>{isLeftWing ? 'LEFT WING (Desk L)' : 'RIGHT WING (Desk R)'}</span>
//           </span>

//           <div className="h-4 w-px bg-zinc-800" />

//           {/* Participant & Team Info */}
//           <div className="flex flex-col items-end font-mono leading-tight">
//             <span className="text-xs text-zinc-400">
//               Participant: <span className="text-white font-semibold">{user?.username}</span>
//             </span>
//             <span className="text-[11px] text-zinc-400 mt-0.5">
//               Team: <span className="text-red-400 font-semibold">{user?.teamName}</span> ({user?.teamCode})
//             </span>
//           </div>

//           <button
//             onClick={handleLogout}
//             className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 transition-colors ml-2"
//           >
//             <LogOut className="w-4 h-4" />
//             <span>Sign Out</span>
//           </button>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="flex-1 max-w-6xl mx-auto w-full p-8 space-y-8">
//         <div className="text-center space-y-2">
//           <span className="text-xs font-bold uppercase tracking-widest text-red-500 font-mono">
//             Tournament Stages
//           </span>
//           <h2 className="text-3xl font-black text-white">Select Accessible Stage</h2>
//           <p className="text-zinc-400 text-sm max-w-lg mx-auto">
//             Review unlocked rounds configured by tournament organizers. Click on any active stage to enter the synchronized code arena.
//           </p>
//         </div>

//         {/* Dynamic Rounds Grid */}
//         {rounds.length === 0 ? (
//           <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl space-y-3 bg-[#111111]">
//             <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
//             <h3 className="text-sm font-bold text-zinc-300">No Stages Currently Configured</h3>
//             <p className="text-xs text-zinc-500">
//               Contest organizers are finalizing the stages. This page will update automatically once rounds are published.
//             </p>
//           </div>
//         ) : (
//           <div className={`grid grid-cols-1 ${rounds.length === 1 ? 'max-w-md mx-auto' : rounds.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-6`}>
//             {rounds.map((round) => {
//               const isLive = round.status === 'ACTIVE';
//               const isLocked = round.status === 'LOCKED';
//               const isCompleted = round.status === 'COMPLETED';
//               const isUpcoming = round.status === 'UPCOMING';

//               return (
//                 <div
//                   key={round.id}
//                   className={`bg-[#141414] border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between transition-all ${
//                     isLive
//                       ? 'border-red-500/80 shadow-2xl shadow-red-950/40'
//                       : isCompleted
//                       ? 'border-zinc-800 opacity-75'
//                       : isLocked
//                       ? 'border-zinc-800/80 bg-zinc-950/60'
//                       : 'border-zinc-800'
//                   }`}
//                 >
//                   <div className="space-y-4">
//                     <div className="flex items-center justify-between">
//                       <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
//                         STAGE {round.id < 10 ? `0${round.id}` : round.id}
//                       </span>

//                       {isLive && (
//                         <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
//                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
//                           LIVE & UNLOCKED
//                         </span>
//                       )}

//                       {isLocked && (
//                         <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
//                           <Lock className="w-3.5 h-3.5" />
//                           LOCKED STAGE
//                         </span>
//                       )}

//                       {isUpcoming && (
//                         <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400 bg-yellow-950/60 border border-yellow-800 px-3 py-1 rounded-full">
//                           <Clock className="w-3.5 h-3.5" />
//                           STARTING SOON
//                         </span>
//                       )}

//                       {isCompleted && (
//                         <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full">
//                           <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
//                           CONCLUDED
//                         </span>
//                       )}
//                     </div>

//                     <div>
//                       <h3 className="text-xl font-bold text-white flex items-center gap-2">
//                         <Code2 className={`w-5 h-5 ${isLive ? 'text-red-500' : 'text-zinc-500'}`} />
//                         <span>{round.title}</span>
//                       </h3>
//                       {round.description && (
//                         <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
//                           {round.description}
//                         </p>
//                       )}
//                     </div>

//                     <div className="bg-[#0A0A0A] border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs font-mono">
//                       <div className="flex items-center justify-between text-zinc-400">
//                         <span>Duration:</span>
//                         <span className="text-zinc-200 font-bold">{round.durationMin} Minutes</span>
//                       </div>
//                       <div className="flex items-center justify-between text-zinc-400">
//                         <span>Challenges:</span>
//                         <span className="text-zinc-200 font-bold">{round.problems?.length || 0} Problems</span>
//                       </div>
//                     </div>

//                     {/* Problems List in this Round */}
//                     <div className="space-y-2">
//                       <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
//                         Assigned Challenges
//                       </span>

//                       {isLocked ? (
//                         <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-center space-y-1">
//                           <Lock className="w-4 h-4 text-zinc-600 mx-auto" />
//                           <p className="text-[11px] text-zinc-500">
//                             Problem statements encrypted until stage is unlocked by organizers.
//                           </p>
//                         </div>
//                       ) : round.problems?.length === 0 ? (
//                         <p className="text-xs text-zinc-500 italic p-2 bg-zinc-900/40 rounded-lg">
//                           No problems assigned yet.
//                         </p>
//                       ) : (
//                         round.problems.map((prob) => (
//                           <button
//                             key={prob.id}
//                             type="button"
//                             onClick={() => isLive && router.push(`/arena/${prob.slug}`)}
//                             disabled={!isLive}
//                             className="w-full text-left flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-800/80 disabled:hover:bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs transition-colors group cursor-pointer disabled:cursor-not-allowed"
//                           >
//                             <span className="font-semibold text-zinc-200 group-hover:text-white flex items-center gap-2">
//                               <Code2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-400" />
//                               <span>{prob.title}</span>
//                             </span>
//                             <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded font-mono text-[10px]">
//                               {prob.difficulty}
//                             </span>
//                           </button>
//                         ))
//                       )}
//                     </div>
//                   </div>

//                   {/* Action Button */}
//                   <div className="pt-6 mt-4 border-t border-zinc-800">
//                     <button
//                       onClick={() => {
//                         const firstSlug = round.problems[0]?.slug || 'two-sum';
//                         router.push(`/arena/${firstSlug}`);
//                       }}
//                       disabled={!isLive || round.problems.length === 0}
//                       className={`w-full py-3.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${
//                         isLive && round.problems.length > 0
//                           ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
//                           : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
//                       }`}
//                     >
//                       {isLive ? (
//                         <>
//                           <span>Enter Stage Workspace</span>
//                           <ArrowRight className="w-4 h-4" />
//                         </>
//                       ) : isLocked ? (
//                         <span>Stage Locked by Organizer</span>
//                       ) : isUpcoming ? (
//                         <span>Starting Soon (Awaiting Launch)</span>
//                       ) : (
//                         <span>Stage Concluded</span>
//                       )}
//                     </button>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </main>
//     </div>
//   );
// }


'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  Shield,
  Lock,
  ArrowRight,
  Clock,
  CheckCircle2,
  MapPin,
  LogOut,
  Code2,
  Terminal,
  Activity,
  Zap,
  Crosshair,
  Radio,
} from 'lucide-react';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

interface ProblemSummary {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  timeLimitMs: number;
}

interface ContestRound {
  id: number;
  title: string;
  description: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
  durationMin: number;
  problems: ProblemSummary[];
}

export default function RoundsPage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<ContestRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    username: string;
    teamName: string;
    teamCode: string;
    seatSide: string;
  } | null>(null);

  const fetchRounds = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/rounds');
      setRounds(res.data.rounds || []);
    } catch (err) {
      console.error('Error fetching rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const teamName = localStorage.getItem('teamName') || 'Your Team';
    const teamCode = localStorage.getItem('teamCode') || 'CODE';
    const seatSide = localStorage.getItem('seatSide') || 'LEFT';

    if (!token) {
      router.push('/login');
      return;
    }

    setUser({ username: username || '', teamName, teamCode, seatSide });
    fetchRounds();

    const socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('ROUND_STATUS_CHANGED', () => {
      fetchRounds();
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-mono relative overflow-hidden">
        {/* Futuristic Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0000_1px,transparent_1px),linear-gradient(to_bottom,#1f0000_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
        <div className="relative z-10 flex flex-col items-center gap-4 border border-red-900/50 bg-black/80 p-8 clip-corner">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-red-600 border-t-transparent animate-spin" />
            <Activity className="w-5 h-5 text-red-500 animate-pulse" />
          </div>
          <span className="text-xs uppercase tracking-widest text-red-500 font-bold">
            INITIALIZING_ARENA_STREAM...
          </span>
        </div>
      </div>
    );
  }

  const activeRound = rounds.find((r) => r.status === 'ACTIVE') || rounds[0];
  const secondaryRounds = rounds.filter((r) => r.id !== activeRound?.id);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-200 flex flex-col font-mono relative overflow-hidden selection:bg-red-600 selection:text-white">
      {/* Background Cybernetic Elements */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#150000_1px,transparent_1px),linear-gradient(to_bottom,#150000_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none" />
      <div className="fixed top-0 left-0 w-96 h-96 bg-red-600/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-red-900/10 blur-[150px] pointer-events-none" />

      {/* Cyber Header */}
      <header className="h-16 border-b border-red-900/40 bg-[#0A0A0A]/90 backdrop-blur-md px-6 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[#FF0033] animate-pulse" />
            <div className="flex flex-col">
            {/* <span className="text-xl font-black tracking-widest text-white uppercase italic font-sans">
              <HackSingWinAnimatedTitle size="nav" />
            </span> */}
            <span className="text-xl font-black tracking-widest text-white uppercase italic font-sans">
              HACK<span className="text-[#FF0033]">SING</span>WIN
            </span>
            <span className="text-[9px] text-[#888888] tracking-widest uppercase">
              POWERED BY HACK CLUB
            </span>
          </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-red-500/60 bg-red-950/20 border border-red-900/30 px-3 py-1">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="tracking-widest text-[10px] uppercase font-bold text-red-400">
              NETWORK_SYNC_ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Seating Wing Badge */}
          <div className="hidden sm:flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs">
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span className="text-zinc-400 uppercase tracking-wider text-[11px]">
              WING:{' '}
              <strong className="text-white">
                {user?.seatSide === 'LEFT' ? 'ALPHA (LEFT)' : 'BETA (RIGHT)'}
              </strong>
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-4 pl-4 border-l border-zinc-800">
            <div className="flex flex-col items-end leading-none">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {user?.username}
              </span>
              <span className="text-[10px] text-red-500/80 mt-1 uppercase tracking-widest">
                [{user?.teamName} // {user?.teamCode}]
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 bg-red-950/30 border border-red-900/50 hover:bg-red-600 hover:text-white text-red-500 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Asymmetrical Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 md:p-8 flex flex-col gap-8 relative z-10">
        {/* Status Bar Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-800/80 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest mb-1">
              <Crosshair className="w-4 h-4" /> TOURNAMENT PROTOCOL
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter italic">
              CONTEST ARENA
            </h1>
          </div>
          <div className="text-xs text-zinc-500 font-mono text-right hidden md:block">
            <div>STATUS: RUNNING</div>
            <div>SYS_TIME: {new Date().toISOString().substring(11, 19)} UTC</div>
          </div>
        </div>

        {rounds.length === 0 ? (
          <div className="p-16 text-center border border-red-900/40 bg-black/60 relative overflow-hidden space-y-4">
            <Terminal className="w-12 h-12 text-red-600 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              NO STAGES INITIALIZED
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Awaiting organizer transmission. Active operational stages will populate automatically upon status update.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ASYMMETRICAL LEFT: Featured Active / Main Arena Hero Panel (8 Cols) */}
            {activeRound && (
              <div className="lg:col-span-8 flex flex-col gap-4">
                <div className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-red-500 fill-red-500" />
                  PRIMARY OBJECTIVE STAGE
                </div>

                <div
                  className={`relative border-2 bg-gradient-to-br from-black via-[#0D0505] to-black p-8 transition-all overflow-hidden ${
                    activeRound.status === 'ACTIVE'
                      ? 'border-red-600 shadow-[0_0_30px_rgba(255,0,60,0.15)]'
                      : 'border-zinc-800'
                  }`}
                  style={{
                    clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
                  }}
                >
                  {/* Decorative corner tag */}
                  <div className="absolute top-0 right-0 bg-red-600 text-black text-[9px] font-black px-4 py-0.5 uppercase tracking-widest">
                    PRIMARY OPERATIONAL TARGET
                  </div>

                  <div className="space-y-6">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-red-500 bg-red-950/80 border border-red-800 px-3 py-1 uppercase tracking-wider">
                          STAGE {activeRound.id < 10 ? `0${activeRound.id}` : activeRound.id}
                        </span>
                        <div className="h-4 w-px bg-zinc-800" />
                        <span className="text-xs text-zinc-400">
                          DURATION: <strong className="text-white">{activeRound.durationMin} MINS</strong>
                        </span>
                      </div>

                      {/* Status pill */}
                      <div>
                        {activeRound.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-red-400 bg-red-950/60 border border-red-600 px-3 py-1 shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                            <span className="w-2 h-2 bg-red-500 animate-ping" />
                            ARENA LIVE
                          </span>
                        )}
                        {activeRound.status === 'LOCKED' && (
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1">
                            <Lock className="w-3.5 h-3.5" /> STAGE ENCRYPTED
                          </span>
                        )}
                        {activeRound.status === 'UPCOMING' && (
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-yellow-500 bg-yellow-950/40 border border-yellow-700 px-3 py-1">
                            <Clock className="w-3.5 h-3.5" /> STANDBY
                          </span>
                        )}
                        {activeRound.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-700 px-3 py-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> TERMINATED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage Title */}
                    <div>
                      <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <Code2 className="w-8 h-8 text-red-500" />
                        {activeRound.title}
                      </h2>
                      {activeRound.description && (
                        <p className="text-sm text-zinc-400 mt-2 max-w-2xl leading-relaxed">
                          {activeRound.description}
                        </p>
                      )}
                    </div>

                    {/* Sub-Problems Section */}
                    <div className="space-y-3 pt-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 block">
                        CHALLENGE DIRECTIVES [{activeRound.problems?.length || 0}]
                      </span>

                      {activeRound.status === 'LOCKED' ? (
                        <div className="p-6 bg-black/60 border border-dashed border-zinc-800 text-center space-y-2">
                          <Lock className="w-6 h-6 text-zinc-600 mx-auto" />
                          <p className="text-xs text-zinc-500">
                            DATA ENCRYPTED. Stage parameters will be unlocked upon tournament controller release.
                          </p>
                        </div>
                      ) : activeRound.problems?.length === 0 ? (
                        <div className="p-4 bg-black/40 border border-zinc-800 text-xs text-zinc-500 italic">
                          NO ASSIGNED DIRECTIVES FOR THIS STAGE.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {activeRound.problems.map((prob) => (
                            <button
                              key={prob.id}
                              type="button"
                              onClick={() => activeRound.status === 'ACTIVE' && router.push(`/arena/${prob.slug}`)}
                              disabled={activeRound.status !== 'ACTIVE'}
                              className="group relative flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 hover:border-red-600 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-2 h-2 bg-zinc-700 group-hover:bg-red-500 transition-colors" />
                                <span className="font-bold text-sm text-zinc-200 group-hover:text-white truncate">
                                  {prob.title}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 group-hover:border-red-900 group-hover:text-red-400">
                                {prob.difficulty}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Dominant Call-to-Action */}
                    <div className="pt-4">
                      <button
                        onClick={() => {
                          const firstSlug = activeRound.problems[0]?.slug || 'two-sum';
                          router.push(`/arena/${firstSlug}`);
                        }}
                        disabled={activeRound.status !== 'ACTIVE' || activeRound.problems.length === 0}
                        className={`w-full py-5 text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 relative group overflow-hidden ${
                          activeRound.status === 'ACTIVE' && activeRound.problems.length > 0
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_30px_rgba(255,0,60,0.4)] cursor-pointer'
                            : 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed'
                        }`}
                        style={{
                          clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
                        }}
                      >
                        {activeRound.status === 'ACTIVE' ? (
                          <>
                            <span>ENTER CODE ARENA</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                          </>
                        ) : activeRound.status === 'LOCKED' ? (
                          <span>STAGE ENCRYPTED BY ORGANIZER</span>
                        ) : activeRound.status === 'UPCOMING' ? (
                          <span>AWAITING STAGE LAUNCH</span>
                        ) : (
                          <span>STAGE TERMINATED</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ASYMMETRICAL RIGHT: Compact Tactical Stack for Secondary Stages (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                ALL STAGE DIRECTIVES [{rounds.length}]
              </div>

              <div className="flex flex-col gap-3">
                {rounds.map((round) => {
                  const isCurrent = round.id === activeRound?.id;
                  const isLive = round.status === 'ACTIVE';
                  const isLocked = round.status === 'LOCKED';

                  return (
                    <div
                      key={round.id}
                      onClick={() =>
                        isLive &&
                        router.push(
                          round.problems[0]?.slug
                            ? `/arena/${round.problems[0].slug}`
                            : `/rounds`
                        )
                      }
                      className={`p-4 bg-zinc-950 border transition-all cursor-pointer relative ${
                        isCurrent
                          ? 'border-red-900/80 bg-red-950/10'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Left vertical status stripe */}
                      <div
                        className={`absolute top-0 left-0 bottom-0 w-1 ${
                          isLive ? 'bg-red-600' : isLocked ? 'bg-zinc-800' : 'bg-zinc-700'
                        }`}
                      />

                      <div className="pl-2 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            STAGE 0{round.id}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 ${
                              isLive
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                            }`}
                          >
                            {round.status}
                          </span>
                        </div>

                        <div className="font-bold text-zinc-200 text-sm uppercase tracking-tight">
                          {round.title}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                          <span>{round.durationMin} MINS</span>
                          <span>{round.problems?.length || 0} PROBLEMS</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tournament Telemetry / System Spec Panel */}
              <div className="p-4 border border-zinc-800/80 bg-black/40 space-y-3 mt-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  SYSTEM TELEMETRY
                </div>
                <div className="text-[11px] space-y-1.5 text-zinc-400">
                  <div className="flex justify-between">
                    <span>EXECUTION ENGINE:</span>
                    <span className="text-zinc-200">ISOLATED V8</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SEATING WING:</span>
                    <span className="text-zinc-200">{user?.seatSide}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SOCKET SYNC:</span>
                    <span className="text-red-500">CONNECTED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}