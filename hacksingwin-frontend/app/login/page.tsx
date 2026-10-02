'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Shield, ArrowRight, AlertCircle, CheckCircle, Lock, User } from 'lucide-react';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', {
        username: username.trim(),
        password,
      });

      const data = response.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('seatSide', data.user.seatSide || 'LEFT');

      if (data.team) {
        localStorage.setItem('teamId', data.team.id);
        localStorage.setItem('teamName', data.team.name);
        localStorage.setItem('teamCode', data.team.teamCode);
        localStorage.setItem('currentEditorId', data.team.currentEditorId || '');
      } else {
        localStorage.removeItem('teamId');
        localStorage.removeItem('teamName');
        localStorage.removeItem('teamCode');
      }

      setSuccessMsg('Login verified. Accessing contest environment...');

      setTimeout(() => {
        if (data.user.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push('/rounds');
        }
      }, 600);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Authentication failed. Please verify your assigned username and password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141414] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Branding Header */}
        <div className="text-center mb-7 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-red-950/60 border border-red-800/80 rounded-2xl mb-4 text-red-500 shadow-lg shadow-red-950/50">
            <Shield className="w-7 h-7" />
          </div>
          <div className="flex justify-center mb-1">
            <HackSingWinAnimatedTitle size="modal" />
          </div>
          <p className="text-zinc-400 text-sm mt-1.5 font-medium">
            2-Person Relay Competitive Programming Platform
          </p>
        </div>

        {/* Admin Credential Notice */}
        <div className="mb-6 p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>
            Participant accounts are provisioned by contest organizers. Use your assigned credentials to sign in.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. team1_member_a"
                className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-900 text-emerald-400 rounded-xl text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 mt-2"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Arena</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>Organizer Login: organizer_main</span>
          <span className="text-zinc-600">v1.0</span>
        </div>
      </div>
    </div>
  );
}
