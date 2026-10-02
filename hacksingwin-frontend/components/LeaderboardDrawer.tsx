'use client';

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Socket } from 'socket.io-client';
import {
  Trophy,
  X,
  Lock,
  RefreshCw,
  AlertCircle,
  XCircle,
  Minus,
  Crown,
  Radio,
} from 'lucide-react';

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
  hidden?: boolean;
  message?: string;
  roundId?: number | null;
  roundTitle?: string;
  roundStatus?: string;
  isRevealedToParticipants?: boolean;
  totalTeams?: number;
  deductionPerFailedAttempt?: number;
  standings?: TeamStanding[];
  updatedAt?: string;
}

interface LeaderboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTeamId?: string;
  socket?: Socket | null;
}

export default function LeaderboardDrawer({
  isOpen,
  onClose,
  currentTeamId,
  socket,
}: LeaderboardDrawerProps) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:4000/api/leaderboard', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(res.data);
    } catch (err: any) {
      console.error('[LeaderboardDrawer] Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load leaderboard standings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, fetchLeaderboard]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (updatedData: LeaderboardData) => {
      setData(updatedData);
    };

    const handleStatusChanged = (statusPayload: { isRevealed: boolean }) => {
      if (statusPayload.isRevealed) {
        fetchLeaderboard();
      } else {
        setData((prev) => ({
          ...prev,
          hidden: true,
          message:
            'The leaderboard is concealed during active contest shifts. Final standings will be revealed when the round concludes.',
        }));
      }
    };

    socket.on('LEADERBOARD_UPDATE', handleUpdate);
    socket.on('LEADERBOARD_STATUS_CHANGED', handleStatusChanged);

    return () => {
      socket.off('LEADERBOARD_UPDATE', handleUpdate);
      socket.off('LEADERBOARD_STATUS_CHANGED', handleStatusChanged);
    };
  }, [socket, fetchLeaderboard]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const standings = data?.standings || [];
  const top1 = standings[0];
  const top2 = standings[1];
  const top3 = standings[2];

  // Extract problems list from the first available team
  const problemKeys = top1 ? Object.keys(top1.problems || {}) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-4xl bg-[#0C0C0C] border-l border-zinc-800 h-full flex flex-col shadow-2xl z-10 text-white">
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-800/80 bg-[#121212] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider uppercase">
                  Tournament Leaderboard
                </h2>
                {data?.roundTitle && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {data.roundTitle}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {data?.hidden
                  ? 'Standings concealed during active relay shift'
                  : `Rankings based on Net Score (-5 pts per rejected attempt)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              title="Refresh standings"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-yellow-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              title="Close drawer (Esc)"
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-300 text-xs font-mono flex items-center gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* CONCEALED STATE NOTICE */}
          {data?.hidden ? (
            <div className="flex flex-col items-center justify-center min-h-[420px] text-center p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/80 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shadow-lg shadow-yellow-500/5">
                <Lock className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Standings Concealed During Active Shift
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {data.message ||
                    'Live rankings are frozen during active relay coding shifts to maintain competitive focus. The official tournament scoreboard will be revealed when this Round concludes.'}
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Round Status: {data.roundStatus || 'ACTIVE'}</span>
              </div>
            </div>
          ) : (
            <>
              {/* PODIUM CARDS (Top 3) */}
              {standings.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {/* #2 SILVER */}
                  {top2 ? (
                    <div className="rounded-xl p-4 bg-zinc-900/40 border border-zinc-700/50 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-300 text-slate-200 font-black text-xs flex items-center justify-center mb-2">
                        2
                      </div>
                      <span className="text-xs font-bold text-zinc-200 truncate max-w-full">
                        {top2.teamName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 mb-1">
                        {top2.teamCode}
                      </span>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        {top2.totalNetScore} <span className="text-xs font-normal">pts</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {top2.problemsSolved} solved
                      </span>
                    </div>
                  ) : <div />}

                  {/* #1 GOLD */}
                  {top1 ? (
                    <div className="rounded-xl p-4 bg-yellow-950/20 border border-yellow-500/40 flex flex-col items-center text-center relative shadow-lg shadow-yellow-500/5 -translate-y-1">
                      <div className="absolute -top-1">
                        <Crown className="w-5 h-5 text-yellow-400 drop-shadow" />
                      </div>
                      <div className="w-9 h-9 rounded-full bg-yellow-500/20 border border-yellow-400 text-yellow-300 font-black text-sm flex items-center justify-center mt-2 mb-2">
                        1
                      </div>
                      <span className="text-xs font-extrabold text-yellow-200 truncate max-w-full">
                        {top1.teamName}
                      </span>
                      <span className="text-[10px] font-mono text-yellow-400/70 mb-1">
                        {top1.teamCode}
                      </span>
                      <div className="text-lg font-black text-yellow-400 font-mono">
                        {top1.totalNetScore} <span className="text-xs font-normal">pts</span>
                      </div>
                      <span className="text-[10px] text-zinc-300 font-mono">
                        {top1.problemsSolved} solved
                      </span>
                    </div>
                  ) : <div />}

                  {/* #3 BRONZE */}
                  {top3 ? (
                    <div className="rounded-xl p-4 bg-zinc-900/40 border border-amber-900/40 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-amber-700/20 border border-amber-600 text-amber-300 font-black text-xs flex items-center justify-center mb-2">
                        3
                      </div>
                      <span className="text-xs font-bold text-zinc-200 truncate max-w-full">
                        {top3.teamName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 mb-1">
                        {top3.teamCode}
                      </span>
                      <div className="text-base font-black text-emerald-400 font-mono">
                        {top3.totalNetScore} <span className="text-xs font-normal">pts</span>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {top3.problemsSolved} solved
                      </span>
                    </div>
                  ) : <div />}
                </div>
              )}

              {/* FULL STANDINGS TABLE */}
              <div className="rounded-xl border border-zinc-800 bg-[#111111] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181818] text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4 w-14 text-center">Rank</th>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-3 text-center">Solved</th>
                      <th className="py-3 px-3 text-right">Net Score</th>
                      <th className="py-3 px-3 text-right">Deductions</th>
                      {problemKeys.map((pKey) => (
                        <th key={pKey} className="py-3 px-2 text-center max-w-[80px] truncate" title={pKey}>
                          {pKey}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {standings.map((team) => {
                      const isCurrentTeam = team.teamId === currentTeamId;
                      return (
                        <tr
                          key={team.teamId}
                          className={`transition-colors ${
                            isCurrentTeam
                              ? 'bg-red-950/40 border-l-4 border-red-500 font-bold'
                              : 'hover:bg-zinc-900/50'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3 px-4 text-center">
                            {team.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-300 font-black text-[11px] border border-yellow-500/40">
                                1
                              </span>
                            ) : team.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 font-bold text-[11px] border border-slate-500/40">
                                2
                              </span>
                            ) : team.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-300 font-bold text-[11px] border border-amber-600/40">
                                3
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-mono">{team.rank}</span>
                            )}
                          </td>

                          {/* Team Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold ${isCurrentTeam ? 'text-red-300' : 'text-zinc-200'}`}>
                                {team.teamName}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 font-normal">
                                {team.teamCode}
                              </span>
                              {isCurrentTeam && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-900/80 text-red-200 font-sans uppercase">
                                  Your Team
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Solved */}
                          <td className="py-3 px-3 text-center">
                            <span className="text-zinc-300 font-bold">
                              {team.problemsSolved}
                            </span>
                          </td>

                          {/* Net Score */}
                          <td className="py-3 px-3 text-right">
                            <span className="text-emerald-400 font-black text-sm">
                              {team.totalNetScore}
                            </span>
                          </td>

                          {/* Deductions */}
                          <td className="py-3 px-3 text-right">
                            {team.totalDeductions > 0 ? (
                              <span className="text-red-400 text-xs">
                                -{team.totalDeductions}
                              </span>
                            ) : (
                              <span className="text-zinc-600 text-xs">0</span>
                            )}
                          </td>

                          {/* Problem Matrix */}
                          {problemKeys.map((pKey) => {
                            const pDetail = team.problems[pKey];
                            if (!pDetail) {
                              return (
                                <td key={pKey} className="py-3 px-2 text-center text-zinc-700">
                                  <Minus className="w-3 h-3 mx-auto" />
                                </td>
                              );
                            }

                            if (pDetail.solved) {
                              return (
                                <td key={pKey} className="py-3 px-2 text-center">
                                  <div
                                    className="inline-flex flex-col items-center text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-emerald-300"
                                    title={`Solved: +${pDetail.netScore} pts (${pDetail.failedAttemptsBeforeAC} rejected)`}
                                  >
                                    <span className="font-bold">+{pDetail.netScore}</span>
                                    {pDetail.failedAttemptsBeforeAC > 0 && (
                                      <span className="text-[9px] text-red-400">
                                        (-{pDetail.deductionPoints})
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            if (pDetail.failedAttemptsBeforeAC > 0) {
                              return (
                                <td key={pKey} className="py-3 px-2 text-center">
                                  <div
                                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/40 text-red-400"
                                    title={`${pDetail.failedAttemptsBeforeAC} unaccepted attempts`}
                                  >
                                    <XCircle className="w-2.5 h-2.5" />
                                    <span>{pDetail.failedAttemptsBeforeAC}</span>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={pKey} className="py-3 px-2 text-center text-zinc-700">
                                <Minus className="w-3 h-3 mx-auto" />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
