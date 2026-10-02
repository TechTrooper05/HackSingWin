'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import {
  Crown,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowLeft,
  Minus,
  XCircle,
} from 'lucide-react';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

interface ProblemDetail {
  problemId: string;
  problemTitle: string;
  problemSlug: string;
  solved: boolean;
  rawScore: number;
  failedAttemptsBeforeAC: number;
  deductionPoints: number;
  netScore: number;
  solvedAt: string | null;
}

interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  teamCode: string;
  problemsSolved: number;
  totalRawScore: number;
  totalDeductions: number;
  totalNetScore: number;
  lastAcceptedAt: string | null;
  problems: Record<string, ProblemDetail>;
}

interface LeaderboardData {
  roundId?: number | null;
  roundTitle?: string;
  roundStatus?: string;
  isRevealedToParticipants?: boolean;
  totalTeams?: number;
  deductionPerFailedAttempt?: number;
  standings: TeamStanding[];
  updatedAt?: string;
}

export default function AdminLivePresentationPage() {
  const router = useRouter();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTogglingReveal, setIsTogglingReveal] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchLiveLeaderboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:4000/api/leaderboard/live', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(res.data);
    } catch (err: any) {
      console.error('[AdminPresentation] Fetch error:', err);
      // If unauthorized, redirect to login
      if (err.response?.status === 401 || err.response?.status === 403) {
        router.push('/');
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchLiveLeaderboard();

    // Setup Socket.IO for real-time stage updates
    const token = localStorage.getItem('token');
    const socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[AdminPresentation] Connected to stage WebSocket feed');
    });

    socket.on('LEADERBOARD_UPDATE', (updated: LeaderboardData) => {
      setData(updated);
    });

    socket.on('LEADERBOARD_STATUS_CHANGED', (status: { isRevealed: boolean }) => {
      setData((prev) => (prev ? { ...prev, isRevealedToParticipants: status.isRevealed } : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchLiveLeaderboard]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const toggleRevealStatus = async () => {
    if (!data) return;
    setIsTogglingReveal(true);
    try {
      const token = localStorage.getItem('token');
      const nextStatus = !data.isRevealedToParticipants;
      const res = await axios.post(
        'http://localhost:4000/api/leaderboard/toggle-reveal',
        { revealed: nextStatus },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setData((prev) => (prev ? { ...prev, isRevealedToParticipants: res.data.isRevealed } : prev));
    } catch (err) {
      console.error('[AdminPresentation] Failed to toggle reveal:', err);
    } finally {
      setIsTogglingReveal(false);
    }
  };

  const standings = data?.standings || [];
  const top1 = standings[0];
  const top2 = standings[1];
  const top3 = standings[2];
  const problemKeys = top1 ? Object.keys(top1.problems || {}) : [];

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* STAGE HEADER BAR */}
      <header className="h-18 px-8 border-b border-zinc-800 bg-[#0F0F0F] flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-5">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Admin Console</span>
          </button>

          <div className="flex items-center gap-3">
            <HackSingWinAnimatedTitle size="presentation" />
            <div className="h-5 w-px bg-zinc-800" />
            <span className="text-xs font-mono font-bold tracking-widest px-3 py-1 rounded-full bg-red-950/80 border border-red-700 text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE STAGE FEED
            </span>
          </div>

          {data?.roundTitle && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold">
                {data.roundTitle} • {data.roundStatus}
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Participant Reveal State Button */}
          <button
            onClick={toggleRevealStatus}
            disabled={isTogglingReveal}
            title="Toggle whether participants can see standings"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
              data?.isRevealedToParticipants
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
            }`}
          >
            {data?.isRevealedToParticipants ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>PARTICIPANTS: REVEALED</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                <span>PARTICIPANTS: CONCEALED</span>
              </>
            )}
          </button>

          <button
            onClick={fetchLiveLeaderboard}
            disabled={isLoading}
            title="Force refresh data"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-yellow-400' : ''}`} />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Stage Mode)'}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* STAGE MAIN BODY */}
      <main className="flex-1 p-8 overflow-y-auto space-y-8">
        {/* HERO PODIUM (TOP 3 TEAMS) */}
        {standings.length > 0 && (
          <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* #2 SILVER (4 cols) */}
            <div className="col-span-4 mt-8">
              {top2 ? (
                <div className="rounded-2xl p-6 bg-gradient-to-b from-slate-900/60 to-zinc-950 border border-slate-700/60 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-slate-400/20 border border-slate-300 text-slate-200 font-black text-xl flex items-center justify-center mb-3">
                    2
                  </div>
                  <h3 className="text-lg font-black text-white truncate max-w-full">
                    {top2.teamName}
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 mb-3">{top2.teamCode}</span>
                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                    {top2.totalNetScore}{' '}
                    <span className="text-sm font-normal text-emerald-400/70">pts</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-400">
                    <span>{top2.problemsSolved} Solved</span>
                    {top2.totalDeductions > 0 && (
                      <span className="text-red-400">(-{top2.totalDeductions} pts)</span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* #1 GOLD (4 cols, elevated) */}
            <div className="col-span-4">
              {top1 ? (
                <div className="rounded-2xl p-7 bg-gradient-to-b from-yellow-950/40 to-zinc-950 border-2 border-yellow-500/70 flex flex-col items-center text-center shadow-2xl shadow-yellow-500/10 relative overflow-hidden -translate-y-2">
                  <div className="absolute top-2">
                    <Crown className="w-7 h-7 text-yellow-400 drop-shadow-md" />
                  </div>
                  <div className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-400 text-yellow-300 font-black text-2xl flex items-center justify-center mt-3 mb-3">
                    1
                  </div>
                  <h3 className="text-xl font-black text-yellow-200 truncate max-w-full">
                    {top1.teamName}
                  </h3>
                  <span className="text-xs font-mono text-yellow-400/80 mb-3">{top1.teamCode}</span>
                  <div className="text-4xl font-black text-yellow-400 font-mono tracking-tight">
                    {top1.totalNetScore}{' '}
                    <span className="text-base font-normal text-yellow-400/70">pts</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-300">
                    <span className="font-bold text-yellow-300">{top1.problemsSolved} Solved</span>
                    {top1.totalDeductions > 0 && (
                      <span className="text-red-400">(-{top1.totalDeductions} pts)</span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* #3 BRONZE (4 cols) */}
            <div className="col-span-4 mt-8">
              {top3 ? (
                <div className="rounded-2xl p-6 bg-gradient-to-b from-amber-950/30 to-zinc-950 border border-amber-800/60 flex flex-col items-center text-center shadow-xl relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-amber-700/20 border border-amber-600 text-amber-300 font-black text-xl flex items-center justify-center mb-3">
                    3
                  </div>
                  <h3 className="text-lg font-black text-white truncate max-w-full">
                    {top3.teamName}
                  </h3>
                  <span className="text-xs font-mono text-zinc-400 mb-3">{top3.teamCode}</span>
                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                    {top3.totalNetScore}{' '}
                    <span className="text-sm font-normal text-emerald-400/70">pts</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs font-mono text-zinc-400">
                    <span>{top3.problemsSolved} Solved</span>
                    {top3.totalDeductions > 0 && (
                      <span className="text-red-400">(-{top3.totalDeductions} pts)</span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* TOURNAMENT STANDINGS TABLE */}
        <div className="max-w-7xl mx-auto rounded-2xl border border-zinc-800 bg-[#0E0E0E] overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-[#141414] text-zinc-400 font-mono text-xs border-b border-zinc-800">
              <tr>
                <th className="py-4 px-6 w-20 text-center font-bold">RANK</th>
                <th className="py-4 px-6 font-bold">TEAM NAME</th>
                <th className="py-4 px-4 text-center font-bold">SOLVED</th>
                <th className="py-4 px-6 text-right font-bold">NET SCORE</th>
                <th className="py-4 px-6 text-right font-bold">DEDUCTIONS</th>
                {problemKeys.map((pKey) => (
                  <th key={pKey} className="py-4 px-4 text-center font-bold truncate max-w-[120px]">
                    {pKey.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-sm">
              {standings.map((team) => (
                <tr key={team.teamId} className="hover:bg-zinc-900/50 transition-colors">
                  {/* Rank */}
                  <td className="py-4 px-6 text-center">
                    {team.rank === 1 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-300 font-black text-sm border-2 border-yellow-400">
                        1
                      </span>
                    ) : team.rank === 2 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-black text-sm border-2 border-slate-400">
                        2
                      </span>
                    ) : team.rank === 3 ? (
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-300 font-black text-sm border-2 border-amber-600">
                        3
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-black text-base">{team.rank}</span>
                    )}
                  </td>

                  {/* Team */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-base text-zinc-100">{team.teamName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {team.teamCode}
                      </span>
                    </div>
                  </td>

                  {/* Problems Solved */}
                  <td className="py-4 px-4 text-center">
                    <span className="font-black text-base text-zinc-200">
                      {team.problemsSolved}
                    </span>
                  </td>

                  {/* Net Score */}
                  <td className="py-4 px-6 text-right">
                    <span className="text-emerald-400 font-black text-xl">
                      {team.totalNetScore}
                    </span>
                  </td>

                  {/* Deductions */}
                  <td className="py-4 px-6 text-right">
                    {team.totalDeductions > 0 ? (
                      <span className="text-red-400 font-bold text-sm">
                        -{team.totalDeductions}
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-sm">0</span>
                    )}
                  </td>

                  {/* Problem Breakdown Matrix */}
                  {problemKeys.map((pKey) => {
                    const p = team.problems[pKey];
                    if (!p) {
                      return (
                        <td key={pKey} className="py-4 px-4 text-center text-zinc-700">
                          <Minus className="w-4 h-4 mx-auto" />
                        </td>
                      );
                    }

                    if (p.solved) {
                      return (
                        <td key={pKey} className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-600 text-emerald-300 text-xs">
                            <span className="font-black">+{p.netScore}</span>
                            {p.failedAttemptsBeforeAC > 0 && (
                              <span className="text-[10px] text-red-400">
                                (-{p.deductionPoints})
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    }

                    if (p.failedAttemptsBeforeAC > 0) {
                      return (
                        <td key={pKey} className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-950/50 border border-red-800 text-red-400 text-xs font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>{p.failedAttemptsBeforeAC}</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={pKey} className="py-4 px-4 text-center text-zinc-700">
                        <Minus className="w-4 h-4 mx-auto" />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
