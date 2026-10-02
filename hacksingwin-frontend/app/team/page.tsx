'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { PlusCircle, LogIn, Copy, Check, ArrowRight, LogOut, Clock, Sparkles } from 'lucide-react';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

export default function TeamPage() {
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [partnerJustJoined, setPartnerJustJoined] = useState(false);

  // 1. Initial Load & Auth Check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('userRole');

    if (!token || !userId) {
      router.push('/login');
      return;
    }

    setUser({ id: userId, username: username || '', role: role || '' });

    // Fetch user's team details from backend
    axios
      .get('http://localhost:4000/api/teams/my-team', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data.team) {
          setTeam(res.data.team);
          localStorage.setItem('teamId', res.data.team.id);
          localStorage.setItem('teamName', res.data.team.name);
          localStorage.setItem('teamCode', res.data.team.teamCode);
        }
      })
      .catch((err) => {
        console.error('Error fetching team:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  // 2. Real-time WebSocket Synchronization
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('⚡ TeamHub connected to real-time gateway');
      if (team?.id) {
        socket.emit('JOIN_TEAM_ROOM', team.id);
      }
    });

    // Handle real-time teammate join event!
    socket.on('TEAM_ROSTER_UPDATED', (data: { team: any }) => {
      console.log('🎉 Real-time team roster update received:', data);
      setTeam(data.team);
      localStorage.setItem('teamId', data.team.id);
      localStorage.setItem('teamName', data.team.name);
      localStorage.setItem('teamCode', data.team.teamCode);
      setPartnerJustJoined(true);
      setTimeout(() => setPartnerJustJoined(false), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, [team?.id]);

  // 3. Resilient Polling Fallback (Polls every 2.5s if waiting for teammate)
  useEffect(() => {
    if (!team || (team.members && team.members.length >= 2)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const interval = setInterval(() => {
      axios
        .get('http://localhost:4000/api/teams/my-team', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          if (res.data.team && res.data.team.members?.length !== team.members?.length) {
            setTeam(res.data.team);
            setPartnerJustJoined(true);
            setTimeout(() => setPartnerJustJoined(false), 5000);
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(interval);
  }, [team]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !teamCode.trim()) {
      setError('Please provide both team name and a unique team code');
      return;
    }

    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/teams/create',
        { teamName: teamName.trim(), teamCode: teamCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const created = res.data.team;
      setTeam(created);
      localStorage.setItem('teamId', created.id);
      localStorage.setItem('teamName', created.name);
      localStorage.setItem('teamCode', created.teamCode);

      // Join team room immediately
      socketRef.current?.emit('JOIN_TEAM_ROOM', created.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter the team code');
      return;
    }

    setSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/teams/join',
        { teamCode: joinCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const joined = res.data.team;
      setTeam(joined);
      localStorage.setItem('teamId', joined.id);
      localStorage.setItem('teamName', joined.name);
      localStorage.setItem('teamCode', joined.teamCode);

      // Join team room immediately
      socketRef.current?.emit('JOIN_TEAM_ROOM', joined.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to join team.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (team?.teamCode) {
      navigator.clipboard.writeText(team.teamCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-zinc-400">Loading team setup...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-4">
      {/* Top Logout / User Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <HackSingWinAnimatedTitle size="nav" />
          <div className="h-4 w-px bg-zinc-800" />
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span>Logged in as:</span>
            <span className="text-white font-bold">{user?.username}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="w-full max-w-xl bg-[#141414] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {team ? (
          /* =========================================================================
             VIEW A: USER HAS A TEAM ALREADY
             ========================================================================= */
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                Your Relay Team
              </span>
              <h1 className="text-3xl font-black mt-1 text-white">{team.name}</h1>
            </div>

            {/* Teammate Joined Realtime Toast Alert */}
            {partnerJustJoined && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2.5 animate-bounce shadow-lg shadow-emerald-950/50">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">
                  Teammate connected! Both players are now synchronized.
                </span>
              </div>
            )}

            {/* Team Code Share Card */}
            <div className="bg-[#0A0A0A] border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                  Team Invite Code
                </span>
                <span className="text-xl font-mono font-black text-red-400 tracking-wider">
                  {team.teamCode}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            {/* Team Members List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Team Roster ({team.members?.length || 1}/2 Members)
                </label>
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  Live Sync
                </span>
              </div>

              <div className="space-y-2">
                {team.members?.map((member: any, idx: number) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3.5 bg-[#0A0A0A] border border-zinc-800 rounded-xl text-sm transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-red-950/60 border border-red-800 text-red-400 rounded-lg flex items-center justify-center font-bold text-xs">
                        {idx === 0 ? 'P1' : 'P2'}
                      </div>
                      <span className="font-semibold text-zinc-200">
                        {member.username} {member.id === user?.id && <span className="text-xs text-zinc-500">(You)</span>}
                      </span>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-emerald-950/40 text-emerald-400 border border-emerald-900 rounded-md font-mono">
                      READY
                    </span>
                  </div>
                ))}

                {/* Waiting slot if only 1 member */}
                {(!team.members || team.members.length < 2) && (
                  <div className="flex items-center justify-between p-3.5 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl text-sm">
                    <div className="flex items-center gap-2.5 text-zinc-500">
                      <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
                      <span className="text-xs">Waiting for teammate to join with code...</span>
                    </div>
                    <span className="text-xs text-yellow-500 font-mono">1 SLOT OPEN</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Enter Arena */}
            <button
              onClick={() => router.push('/arena/two-sum')}
              className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 mt-4"
            >
              <span>Enter Competition Arena</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* =========================================================================
             VIEW B: USER DOES NOT HAVE A TEAM YET (CREATE OR JOIN)
             ========================================================================= */
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-black text-white">Assemble Your Team</h1>
              <p className="text-zinc-400 text-xs mt-1">
                Create a new relay team or enter your teammate&apos;s code to link up
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 bg-[#0A0A0A] border border-zinc-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('create');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'create' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create Team</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('join');
                  setError('');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'join' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Join Team</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-xs">
                {error}
              </div>
            )}

            {mode === 'create' ? (
              /* Create Team Form */
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. CodeWarriors"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Create Team Code (Share with Teammate)
                  </label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="e.g. WARRIOR99"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-red-500"
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 mt-2"
                >
                  {submitting ? 'Creating Team...' : 'Create Team & Get Invite Code'}
                </button>
              </form>
            ) : (
              /* Join Team Form */
              <form onSubmit={handleJoinTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Enter Teammate&apos;s Team Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g. WARRIOR99"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:border-red-500"
                    disabled={submitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 mt-2"
                >
                  {submitting ? 'Joining Team...' : 'Join Team'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
