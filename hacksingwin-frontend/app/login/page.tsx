// 'use client';

// import { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';
// import { Shield, ArrowRight, AlertCircle, CheckCircle, Lock, User } from 'lucide-react';
// import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

// export default function LoginPage() {
//   const router = useRouter();
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [successMsg, setSuccessMsg] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!username.trim() || !password) {
//       setError('Please enter both username and password');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccessMsg('');

//     try {
//       const response = await axios.post('http://localhost:4000/api/auth/login', {
//         username: username.trim(),
//         password,
//       });

//       const data = response.data;
//       localStorage.setItem('token', data.token);
//       localStorage.setItem('userId', data.user.id);
//       localStorage.setItem('username', data.user.username);
//       localStorage.setItem('userRole', data.user.role);
//       localStorage.setItem('seatSide', data.user.seatSide || 'LEFT');

//       if (data.team) {
//         localStorage.setItem('teamId', data.team.id);
//         localStorage.setItem('teamName', data.team.name);
//         localStorage.setItem('teamCode', data.team.teamCode);
//         localStorage.setItem('currentEditorId', data.team.currentEditorId || '');
//       } else {
//         localStorage.removeItem('teamId');
//         localStorage.removeItem('teamName');
//         localStorage.removeItem('teamCode');
//       }

//       setSuccessMsg('Login verified. Accessing contest environment...');

//       setTimeout(() => {
//         if (data.user.role === 'ADMIN') {
//           router.push('/admin');
//         } else {
//           router.push('/rounds');
//         }
//       }, 600);
//     } catch (err: any) {
//       setError(
//         err.response?.data?.error ||
//           'Authentication failed. Please verify your assigned username and password.'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-4">
//       <div className="w-full max-w-md bg-[#141414] border border-zinc-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
//         {/* Subtle Ambient Glow */}
//         <div className="absolute -top-16 -left-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
//         <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

//         {/* Branding Header */}
//         <div className="text-center mb-7 relative">
//           {/* <div className="inline-flex items-center justify-center w-14 h-14 bg-red-950/60 border border-red-800/80 rounded-2xl mb-4 text-red-500 shadow-lg shadow-red-950/50">
//             <Shield className="w-7 h-7" />
//           </div> */}
//           <div className="flex justify-center mb-1">
//             <HackSingWinAnimatedTitle size="modal" />
//           </div>
//           <p className="text-zinc-400 text-sm mt-1.5 font-medium">
//             2-Person Relay Competitive Programming Platform
//           </p>
//         </div>

//         {/* Admin Credential Notice */}
//         <div className="mb-6 p-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 flex items-start gap-2.5">
//           <Lock className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
//           <span>
//             Participant accounts are provisioned by contest organizers. Use your assigned credentials to sign in.
//           </span>
//         </div>

//         <form onSubmit={handleSubmit} className="space-y-4 relative">
//           <div>
//             <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
//               Username
//             </label>
//             <div className="relative">
//               <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
//               <input
//                 type="text"
//                 value={username}
//                 onChange={(e) => setUsername(e.target.value)}
//                 placeholder="e.g. team1_member_a"
//                 className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
//                 disabled={loading}
//                 autoFocus
//               />
//             </div>
//           </div>

//           <div>
//             <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
//               Password
//             </label>
//             <div className="relative">
//               <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
//               <input
//                 type="password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 placeholder="••••••••"
//                 className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all placeholder:text-zinc-600"
//                 disabled={loading}
//               />
//             </div>
//           </div>

//           {error && (
//             <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-xl text-xs">
//               <AlertCircle className="w-4 h-4 flex-shrink-0" />
//               <span>{error}</span>
//             </div>
//           )}

//           {successMsg && (
//             <div className="flex items-center gap-2 p-3 bg-emerald-950/50 border border-emerald-900 text-emerald-400 rounded-xl text-xs">
//               <CheckCircle className="w-4 h-4 flex-shrink-0" />
//               <span>{successMsg}</span>
//             </div>
//           )}

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full py-3.5 bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-600/30 mt-2"
//           >
//             {loading ? (
//               <span className="animate-pulse">Authenticating...</span>
//             ) : (
//               <>
//                 <span>Sign In to Arena</span>
//                 <ArrowRight className="w-4 h-4" />
//               </>
//             )}
//           </button>
//         </form>

//         {/* <div className="mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
//           <span>Organizer Login: organizer_main</span>
//           <span className="text-zinc-600">v1.0</span>
//         </div> */}
//       </div>
//     </div>
//   );
// }




// 'use client';

// import React, { useState } from 'react';
// import { useRouter } from 'next/navigation';
// import axios from 'axios';

// export default function CenteredLoginPage() {
//   const router = useRouter();
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [error, setError] = useState('');
//   const [successMsg, setSuccessMsg] = useState('');
//   const [loading, setLoading] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!username.trim() || !password) {
//       setError('Please enter both username and password');
//       return;
//     }

//     setLoading(true);
//     setError('');
//     setSuccessMsg('');

//     try {
//       const response = await axios.post('http://localhost:4000/api/auth/login', {
//         username: username.trim(),
//         password,
//       });

//       const data = response.data;
//       localStorage.setItem('token', data.token);
//       localStorage.setItem('userId', data.user.id);
//       localStorage.setItem('username', data.user.username);
//       localStorage.setItem('userRole', data.user.role);
//       localStorage.setItem('seatSide', data.user.seatSide || 'LEFT');

//       if (data.team) {
//         localStorage.setItem('teamId', data.team.id);
//         localStorage.setItem('teamName', data.team.name);
//         localStorage.setItem('teamCode', data.team.teamCode);
//         localStorage.setItem('currentEditorId', data.team.currentEditorId || '');
//       } else {
//         localStorage.removeItem('teamId');
//         localStorage.removeItem('teamName');
//         localStorage.removeItem('teamCode');
//       }

//       setSuccessMsg('Login verified. Accessing contest environment...');

//       setTimeout(() => {
//         if (data.user.role === 'ADMIN') {
//           router.push('/admin');
//         } else {
//           router.push('/rounds');
//         }
//       }, 600);
//     } catch (err: any) {
//       setError(
//         err.response?.data?.error ||
//           'Authentication failed. Please verify your assigned username and password.'
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#030304] text-white flex items-center justify-center p-4 relative overflow-hidden font-mono">
      
//       {/* Subtle Ambient Scanline Overlay */}
//       <div className="scanlines fixed inset-0 pointer-events-none z-50 opacity-20" />

//       {/* Background Grid Accent */}
//       <div className="bg-grid absolute inset-0 z-0 pointer-events-none" />

//       {/* Dual Red Halo Background Glows */}
//       <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#FF003C] rounded-full animate-red-glow pointer-events-none" />
//       <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-900 rounded-full animate-red-glow pointer-events-none" />

//       <div className="w-full max-w-md relative z-10">

//         {/* Corner Bracket Frame Elements */}
//         <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#FF003C] z-20 pointer-events-none" />
//         <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#FF003C] z-20 pointer-events-none" />
//         <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#FF003C] z-20 pointer-events-none" />
//         <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#FF003C] z-20 pointer-events-none" />

//         {/* Main Cyber Panel Box */}
//         <div className="bg-[#0A0A0D] border-2 border-red-950/90 p-8 shadow-[0_0_60px_rgba(255,0,60,0.15)] clip-card-box relative">

//           {/* Header Branding */}
//           <div className="border-b border-red-900/40 pb-5 mb-6 text-center relative">

//             <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-red-950/80 border border-red-600/40 text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">
//               <span className="w-1.5 h-1.5 bg-[#FF003C] animate-pulse" />
//               RELAY CONTEST GATEWAY
//             </div>

//             <h1 className="text-3xl font-black tracking-tight text-white uppercase font-sans leading-none">
//               HACK<span className="text-[#FF003C]">SING</span>WIN
//             </h1>

//             <p className="text-zinc-500 text-xs font-mono mt-2">
//               2-Person Relay Competitive Programming
//             </p>
//           </div>

//           {/* Contestant Credential Alert */}
//           <div className="mb-6 p-3 bg-red-950/30 border border-red-900/40 text-xs text-zinc-400 font-mono flex items-start gap-2.5">
//             <span className="text-[#FF003C] font-bold text-sm">ⓘ</span>
//             <span>
//               Accounts are provisioned by organizers. Use your assigned
//               credentials to sign in.
//             </span>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-5 font-mono">

//             {/* Username Input */}
//             <div>
//               <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex justify-between">
//                 <span>USERNAME</span>
//                 <span className="text-zinc-600 text-[10px]">
//                   REQUIRED
//                 </span>
//               </label>

//               <div className="relative group">
//                 <input
//                   type="text"
//                   value={username}
//                   onChange={(e) => setUsername(e.target.value)}
//                   placeholder="e.g. team1_member_a"
//                   className="w-full bg-[#030304] border border-zinc-800 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] transition-all placeholder:text-zinc-700 rounded-none"
//                   disabled={loading}
//                   autoFocus
//                 />

//                 <div className="absolute right-2.5 top-3.5 w-1.5 h-1.5 bg-zinc-700 group-focus-within:bg-[#FF003C] transition-colors" />
//               </div>
//             </div>

//             {/* Password Input */}
//             <div>
//               <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex justify-between">
//                 <span>PASSWORD</span>
//                 <span className="text-zinc-600 text-[10px]">
//                   ENCRYPTED
//                 </span>
//               </label>

//               <div className="relative group">
//                 <input
//                   type="password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder="••••••••••••"
//                   className="w-full bg-[#030304] border border-zinc-800 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] transition-all placeholder:text-zinc-700 rounded-none"
//                   disabled={loading}
//                 />

//                 <div className="absolute right-2.5 top-3.5 w-1.5 h-1.5 bg-zinc-700 group-focus-within:bg-[#FF003C] transition-colors" />
//               </div>
//             </div>

//             {/* Error Banner */}
//             {error && (
//               <div className="p-3 bg-red-950/80 border-l-2 border-[#FF003C] text-red-300 text-xs font-mono flex items-center gap-2">
//                 <span className="text-[#FF003C] font-bold">
//                   ![ERR]
//                 </span>
//                 <span>{error}</span>
//               </div>
//             )}

//             {/* Success Banner */}
//             {successMsg && (
//               <div className="p-3 bg-emerald-950/80 border-l-2 border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2">
//                 <span className="text-emerald-400 font-bold">
//                   ✓[OK]
//                 </span>
//                 <span>{successMsg}</span>
//               </div>
//             )}

//             {/* Primary CTA Button */}
//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full py-4 bg-[#FF003C] hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(255,0,60,0.4)] hover:shadow-[0_0_40px_rgba(255,0,60,0.7)] flex items-center justify-center gap-2 relative clip-btn group mt-2"
//             >
//               {loading ? (
//                 <span className="animate-pulse">
//                   AUTHENTICATING...
//                 </span>
//               ) : (
//                 <>
//                   <span>ENTER ARENA</span>
//                   <span className="group-hover:translate-x-1 transition-transform text-lg">
//                     →
//                   </span>
//                 </>
//               )}
//             </button>

//           </form>

//           {/* Bottom Footer Info */}
//           <div className="mt-8 pt-4 border-t border-red-900/30 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
//             <span className="text-red-400 font-bold">
//               HACKSINGWIN v2.0
//             </span>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// }


'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

export default function CenteredLoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const response = await axios.post(
        'http://localhost:4000/api/auth/login',
        {
          username: username.trim(),
          password,
        }
      );

      const data = response.data;

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem(
        'seatSide',
        data.user.seatSide || 'LEFT'
      );

      if (data.team) {
        localStorage.setItem('teamId', data.team.id);
        localStorage.setItem('teamName', data.team.name);
        localStorage.setItem('teamCode', data.team.teamCode);
        localStorage.setItem(
          'currentEditorId',
          data.team.currentEditorId || ''
        );
      } else {
        localStorage.removeItem('teamId');
        localStorage.removeItem('teamName');
        localStorage.removeItem('teamCode');
        localStorage.removeItem('currentEditorId');
      }

      setSuccessMsg(
        'Login verified. Accessing contest environment...'
      );

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
    <div className="min-h-screen bg-[#030304] text-white flex items-center justify-center p-4 relative overflow-hidden font-mono">

      {/* Custom animations */}
      <style jsx>{`
        @keyframes gridPulse {
          0%,
          100% {
            opacity: 0.25;
          }

          50% {
            opacity: 0.4;
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.35;
            filter: blur(80px);
          }

          50% {
            opacity: 0.65;
            filter: blur(100px);
          }
        }
      `}</style>

      {/* Scanline Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-20"
        style={{
          background: `
            linear-gradient(
              to bottom,
              rgba(255,255,255,0),
              rgba(255,255,255,0) 50%,
              rgba(0,0,0,0.45) 50%,
              rgba(0,0,0,0.45)
            )
          `,
          backgroundSize: '100% 4px',
        }}
      />

      {/* Background Grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, #FF003C 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          animation: 'gridPulse 4s ease-in-out infinite',
        }}
      />

      {/* Top Left Glow */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-[#FF003C] rounded-full pointer-events-none"
        style={{
          animation: 'pulseGlow 5s infinite ease-in-out',
        }}
      />

      {/* Bottom Right Glow */}
      <div
        className="absolute -bottom-32 -right-32 w-96 h-96 bg-red-900 rounded-full pointer-events-none"
        style={{
          animation: 'pulseGlow 5s infinite ease-in-out',
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">

        {/* Corner Brackets */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#FF003C] z-20 pointer-events-none" />

        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#FF003C] z-20 pointer-events-none" />

        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#FF003C] z-20 pointer-events-none" />

        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#FF003C] z-20 pointer-events-none" />

        {/* Main Panel */}
        <div
          className="bg-[#0A0A0D] border-2 border-red-950/90 p-8 shadow-[0_0_60px_rgba(255,0,60,0.15)] relative"
          style={{
            clipPath:
              'polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)',
          }}
        >

          {/* Header */}
          <div className="border-b border-red-900/40 pb-5 mb-6 text-center relative">

            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-red-950/80 border border-red-600/40 text-[10px] text-red-400 font-bold uppercase tracking-widest mb-3">
              <span className="w-1.5 h-1.5 bg-[#FF003C] animate-pulse" />
              RELAY CONTEST GATEWAY
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white uppercase font-sans leading-none">
              HACK<span className="text-[#FF003C]">SING</span>WIN
            </h1>

            <p className="text-zinc-500 text-xs font-mono mt-2">
              2-Person Relay Competitive Programming
            </p>
          </div>

          {/* Credential Notice */}
          <div className="mb-6 p-3 bg-red-950/30 border border-red-900/40 text-xs text-zinc-400 font-mono flex items-start gap-2.5">
            <span className="text-[#FF003C] font-bold text-sm">
              ⓘ
            </span>

            <span>
              Accounts are provisioned by organizers. Use your assigned
              credentials to sign in.
            </span>
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 font-mono"
          >

            {/* Username */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex justify-between">
                <span>USERNAME</span>

                <span className="text-zinc-600 text-[10px]">
                  REQUIRED
                </span>
              </label>

              <div className="relative group">

                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. team1_member_a"
                  className="w-full bg-[#030304] border border-zinc-800 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] transition-all placeholder:text-zinc-700 rounded-none"
                  disabled={loading}
                  autoFocus
                />

                <div className="absolute right-2.5 top-3.5 w-1.5 h-1.5 bg-zinc-700 group-focus-within:bg-[#FF003C] transition-colors" />

              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2 flex justify-between">
                <span>PASSWORD</span>

                <span className="text-zinc-600 text-[10px]">
                  ENCRYPTED
                </span>
              </label>

              <div className="relative group">

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#030304] border border-zinc-800 text-white px-4 py-3 text-sm focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] transition-all placeholder:text-zinc-700 rounded-none"
                  disabled={loading}
                />

                <div className="absolute right-2.5 top-3.5 w-1.5 h-1.5 bg-zinc-700 group-focus-within:bg-[#FF003C] transition-colors" />

              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-950/80 border-l-2 border-[#FF003C] text-red-300 text-xs font-mono flex items-center gap-2">

                <span className="text-[#FF003C] font-bold">
                  ![ERR]
                </span>

                <span>{error}</span>

              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="p-3 bg-emerald-950/80 border-l-2 border-emerald-500 text-emerald-300 text-xs font-mono flex items-center gap-2">

                <span className="text-emerald-400 font-bold">
                  ✓[OK]
                </span>

                <span>{successMsg}</span>

              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#FF003C] hover:bg-red-500 active:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_25px_rgba(255,0,60,0.4)] hover:shadow-[0_0_40px_rgba(255,0,60,0.7)] flex items-center justify-center gap-2 relative group mt-2"
              style={{
                clipPath:
                  'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
              }}
            >
              {loading ? (
                <span className="animate-pulse">
                  AUTHENTICATING...
                </span>
              ) : (
                <>
                  <span>ENTER ARENA</span>

                  <span className="group-hover:translate-x-1 transition-transform text-lg">
                    →
                  </span>
                </>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-red-900/30 flex items-center justify-between text-[10px] text-zinc-500 font-mono">

            <span className="text-red-400 font-bold">
              HACKSINGWIN v2.0
            </span>

          </div>

        </div>
      </div>
    </div>
  );
}