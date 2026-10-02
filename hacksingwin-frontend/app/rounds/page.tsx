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
  Layers,
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
  const [user, setUser] = useState<{ username: string; teamName: string; teamCode: string; seatSide: string } | null>(null);

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

    // Listen for real-time round status changes from admin
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
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-zinc-400">Loading contest stages...</span>
        </div>
      </div>
    );
  }

  const isLeftWing = user?.seatSide === 'LEFT';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-[#141414] px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-red-950/70 border border-red-800 text-red-500 rounded-xl flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2">
            <HackSingWinAnimatedTitle size="nav" />
            <span className="text-[10px] bg-red-900/60 border border-red-700 text-red-300 px-2 py-0.5 rounded-full font-mono">
              CONTEST ARENA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Seating Wing Badge */}
          <span
            className={`text-xs px-3 py-1 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
              isLeftWing
                ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                : 'bg-purple-950/80 border-purple-600 text-purple-300'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{isLeftWing ? 'LEFT WING (Desk L)' : 'RIGHT WING (Desk R)'}</span>
          </span>

          <div className="h-4 w-px bg-zinc-800" />

          {/* Participant & Team Info */}
          <div className="flex flex-col items-end font-mono leading-tight">
            <span className="text-xs text-zinc-400">
              Participant: <span className="text-white font-semibold">{user?.username}</span>
            </span>
            <span className="text-[11px] text-zinc-400 mt-0.5">
              Team: <span className="text-red-400 font-semibold">{user?.teamName}</span> ({user?.teamCode})
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-red-400 transition-colors ml-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-red-500 font-mono">
            Tournament Stages
          </span>
          <h2 className="text-3xl font-black text-white">Select Accessible Stage</h2>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto">
            Review unlocked rounds configured by tournament organizers. Click on any active stage to enter the synchronized code arena.
          </p>
        </div>

        {/* Dynamic Rounds Grid */}
        {rounds.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl space-y-3 bg-[#111111]">
            <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300">No Stages Currently Configured</h3>
            <p className="text-xs text-zinc-500">
              Contest organizers are finalizing the stages. This page will update automatically once rounds are published.
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${rounds.length === 1 ? 'max-w-md mx-auto' : rounds.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-6`}>
            {rounds.map((round) => {
              const isLive = round.status === 'ACTIVE';
              const isLocked = round.status === 'LOCKED';
              const isCompleted = round.status === 'COMPLETED';
              const isUpcoming = round.status === 'UPCOMING';

              return (
                <div
                  key={round.id}
                  className={`bg-[#141414] border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between transition-all ${
                    isLive
                      ? 'border-red-500/80 shadow-2xl shadow-red-950/40'
                      : isCompleted
                      ? 'border-zinc-800 opacity-75'
                      : isLocked
                      ? 'border-zinc-800/80 bg-zinc-950/60'
                      : 'border-zinc-800'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md">
                        STAGE {round.id < 10 ? `0${round.id}` : round.id}
                      </span>

                      {isLive && (
                        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                          LIVE & UNLOCKED
                        </span>
                      )}

                      {isLocked && (
                        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
                          <Lock className="w-3.5 h-3.5" />
                          LOCKED STAGE
                        </span>
                      )}

                      {isUpcoming && (
                        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-yellow-400 bg-yellow-950/60 border border-yellow-800 px-3 py-1 rounded-full">
                          <Clock className="w-3.5 h-3.5" />
                          STARTING SOON
                        </span>
                      )}

                      {isCompleted && (
                        <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-700 px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                          CONCLUDED
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Code2 className={`w-5 h-5 ${isLive ? 'text-red-500' : 'text-zinc-500'}`} />
                        <span>{round.title}</span>
                      </h3>
                      {round.description && (
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                          {round.description}
                        </p>
                      )}
                    </div>

                    <div className="bg-[#0A0A0A] border border-zinc-800/80 rounded-xl p-3.5 space-y-2 text-xs font-mono">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Duration:</span>
                        <span className="text-zinc-200 font-bold">{round.durationMin} Minutes</span>
                      </div>
                      <div className="flex items-center justify-between text-zinc-400">
                        <span>Challenges:</span>
                        <span className="text-zinc-200 font-bold">{round.problems?.length || 0} Problems</span>
                      </div>
                    </div>

                    {/* Problems List in this Round */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Assigned Challenges
                      </span>

                      {isLocked ? (
                        <div className="p-4 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-center space-y-1">
                          <Lock className="w-4 h-4 text-zinc-600 mx-auto" />
                          <p className="text-[11px] text-zinc-500">
                            Problem statements encrypted until stage is unlocked by organizers.
                          </p>
                        </div>
                      ) : round.problems?.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic p-2 bg-zinc-900/40 rounded-lg">
                          No problems assigned yet.
                        </p>
                      ) : (
                        round.problems.map((prob) => (
                          <button
                            key={prob.id}
                            type="button"
                            onClick={() => isLive && router.push(`/arena/${prob.slug}`)}
                            disabled={!isLive}
                            className="w-full text-left flex items-center justify-between p-3 bg-zinc-900/60 hover:bg-zinc-800/80 disabled:hover:bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs transition-colors group cursor-pointer disabled:cursor-not-allowed"
                          >
                            <span className="font-semibold text-zinc-200 group-hover:text-white flex items-center gap-2">
                              <Code2 className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-400" />
                              <span>{prob.title}</span>
                            </span>
                            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded font-mono text-[10px]">
                              {prob.difficulty}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-6 mt-4 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        const firstSlug = round.problems[0]?.slug || 'two-sum';
                        router.push(`/arena/${firstSlug}`);
                      }}
                      disabled={!isLive || round.problems.length === 0}
                      className={`w-full py-3.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 ${
                        isLive && round.problems.length > 0
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {isLive ? (
                        <>
                          <span>Enter Stage Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : isLocked ? (
                        <span>Stage Locked by Organizer</span>
                      ) : isUpcoming ? (
                        <span>Starting Soon (Awaiting Launch)</span>
                      ) : (
                        <span>Stage Concluded</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
