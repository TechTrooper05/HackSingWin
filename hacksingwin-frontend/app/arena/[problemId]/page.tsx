'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import {
  User,
  ArrowLeft,
  MapPin,
  ShieldAlert,
  RotateCw,
  Edit3,
  Eye,
  Terminal,
  Clock,
  AlertTriangle,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
  Loader2,
  History,
  Trophy,
} from 'lucide-react';
import LeaderboardDrawer from '@/components/LeaderboardDrawer';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

function getStarterCode(slug: string | undefined, lang: string): string {
  const cleanSlug = (slug || '').toLowerCase();

  // 1. Two Sum
  if (cleanSlug === 'two-sum') {
    if (lang === 'python') {
      return `# Two Sum Solution
import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    
    seen = {}
    for i, x in enumerate(nums):
        diff = target - x
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[x] = i

if __name__ == '__main__':
    solve()
`;
    }
    if (lang === 'javascript') {
      return `// Two Sum Solution
const fs = require('fs');

function solve() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length < 3) return;
    const n = parseInt(input[0], 10);
    const nums = input.slice(1, n + 1).map(Number);
    const target = parseInt(input[n + 1], 10);
    const seen = new Map();
    for (let i = 0; i < nums.length; i++) {
        const diff = target - nums[i];
        if (seen.has(diff)) {
            console.log(\`\${seen.get(diff)} \${i}\`);
            return;
        }
        seen.set(nums[i], i);
    }
}
solve();
`;
    }
  }

  // 2. Subarray / Double the Number
  if (cleanSlug === 'subarray' || cleanSlug === 'subarraysum' || cleanSlug === 'double-the-number') {
    if (lang === 'python') {
      return `# Solution for ${slug}
import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    x = int(lines[0])
    print(x * 2)

if __name__ == '__main__':
    solve()
`;
    }
    if (lang === 'javascript') {
      return `const fs = require('fs');
function solve() {
    const lines = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!lines || lines.length === 0) return;
    const x = parseInt(lines[0], 10);
    console.log(x * 2);
}
solve();
`;
    }
  }

  // 3. Generic competitive programming template
  if (lang === 'python') {
    return `# Solution Template
import sys

def solve():
    # Read tokens from standard input
    lines = sys.stdin.read().split()
    if not lines:
        return
    # Write solution logic here
    pass

if __name__ == '__main__':
    solve()
`;
  }
  if (lang === 'javascript') {
    return `const fs = require('fs');

function solve() {
    const tokens = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!tokens || tokens.length === 0) return;
    // Write solution logic here
}

solve();
`;
  }
  if (lang === 'cpp') {
    return `#include <iostream>
using namespace std;

int main() {
    // Read input from cin and print answer to cout
    return 0;
}
`;
  }
  if (lang === 'java') {
    return `import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Read input and print answer
    }
}
`;
  }

  return '# Write your solution here\n';
}

export default function ArenaPage() {
  const { problemId } = useParams<{ problemId: string }>();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const editorRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // Relay floor state
  const [activeEditorId, setActiveEditorId] = useState<string | null>(null);
  const [lockGen, setLockGen] = useState<number>(1);
  const [code, setCode] = useState<string>(getStarterCode(problemId, 'python'));
  const [isHandoverLocked, setIsHandoverLocked] = useState<boolean>(false);
  const [handoverMessage, setHandoverMessage] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');

  // Turn Countdown Timer state
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(0);

  // Anti-Cheat Security Notice
  const [securityNotice, setSecurityNotice] = useState<string>('');

  // Code Execution & Official Submission State
  const [isRunningSample, setIsRunningSample] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sampleResults, setSampleResults] = useState<any[] | null>(null);
  const [activeSampleIndex, setActiveSampleIndex] = useState<number>(0);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [pastSubmissions, setPastSubmissions] = useState<any[]>([]);
  const [consoleTab, setConsoleTab] = useState<'results' | 'compiler' | 'history'>('results');
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [submitCooldown, setSubmitCooldown] = useState<number>(0);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);

  const [user, setUser] = useState<{
    id: string;
    username: string;
    teamId: string;
    role: string;
    seatSide?: string;
  } | null>(null);

  // Geolocation Check State
  const [geoChecking, setGeoChecking] = useState(true);
  const [geoBlocked, setGeoBlocked] = useState(false);
  const [geoInfo, setGeoInfo] = useState<{ distanceMeters?: number; allowedRadiusMeters?: number } | null>(null);

  // Synchronized countdown timer tick
  useEffect(() => {
    if (!turnDeadline) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((turnDeadline - Date.now()) / 1000));
      setTimeLeftSeconds(remaining);
    };

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, [turnDeadline]);

  // Anti-Cheat: Tab Switch & Large Paste Telemetry Listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('TELEMETRY_LOG', {
            eventType: 'TAB_SWITCH',
            metadata: { problemId, timestamp: new Date().toISOString() },
          });
        }
        setSecurityNotice('Window focus lost. Tab switch event logged to tournament organizers.');
        setTimeout(() => setSecurityNotice(''), 6000);
      }
    };

    const handleWindowPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text') || '';
      if (pasted.length > 50) {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('TELEMETRY_LOG', {
            eventType: 'LARGE_PASTE',
            metadata: {
              length: pasted.length,
              snippet: pasted.slice(0, 35),
              problemId,
            },
          });
        }
        setSecurityNotice(`Large paste volume (${pasted.length} characters) detected and logged to organizers.`);
        setTimeout(() => setSecurityNotice(''), 6000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('paste', handleWindowPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [problemId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const teamId = localStorage.getItem('teamId');
    const role = localStorage.getItem('userRole');
    const seatSide = localStorage.getItem('seatSide') || 'LEFT';

    if (!token || !userId) {
      router.push('/login');
      return;
    }

    setUser({
      id: userId,
      username: username || '',
      teamId: teamId || '',
      role: role || '',
      seatSide,
    });

    // 1. Check Geolocation Verification
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const geoRes = await axios.post('http://localhost:4000/api/auth/verify-location', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });

            if (geoRes.data.geoLockEnabled && !geoRes.data.allowed) {
              setGeoBlocked(true);
              setGeoInfo({
                distanceMeters: geoRes.data.distanceMeters,
                allowedRadiusMeters: geoRes.data.allowedRadiusMeters,
              });
            }
          } catch (e) {
            console.warn('Geolocation verify error:', e);
          } finally {
            setGeoChecking(false);
          }
        },
        () => {
          setGeoChecking(false);
        },
        { timeout: 6000 }
      );
    } else {
      setGeoChecking(false);
    }

    // 2. Fetch Problem from Backend
    axios
      .get(`http://localhost:4000/api/problems/${problemId || 'two-sum'}`)
      .then((res) => {
        setProblem(res.data);
        const resolvedSlug = res.data?.slug || problemId;
        const starter = getStarterCode(resolvedSlug, selectedLanguage);
        setCode((prevCode) => {
          const isGenericOrOther =
            !prevCode.trim() ||
            prevCode.includes('Shared Monaco Editor') ||
            prevCode.includes('Two Sum Solution') ||
            prevCode.includes('Solution Template');
          if (isGenericOrOther) {
            if (editorRef.current) {
              const model = editorRef.current.getModel();
              if (model) model.setValue(starter);
            }
            return starter;
          }
          return prevCode;
        });
      })
      .catch((err) => {
        console.error('Failed to load problem:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 3. Connect to Socket.IO Backend with JWT Handshake
    const socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      console.log('Connected to HackSingWin Socket.IO gateway');
    });

    // Initial state on connection/reconnection
    socket.on('SYNC_STATE', (data: {
      code: string;
      activeEditorId: string | null;
      genId: number;
      turnDeadline?: number;
    }) => {
      console.log('Received workspace sync state:', data);
      if (data.code !== undefined && data.code !== null && data.code !== '') {
        setCode(data.code);
      }
      setActiveEditorId(data.activeEditorId);
      setLockGen(data.genId || 1);
      if (data.turnDeadline) {
        setTurnDeadline(data.turnDeadline);
      }
      setIsHandoverLocked(false);
    });

    // Remote teammate keystrokes with Spectator Cursor & Scroll Preservation
    socket.on('REMOTE_CODE_UPDATE', (data: { code: string; genId: number; senderId: string }) => {
      setLockGen(data.genId);
      if (editorRef.current) {
        const pos = editorRef.current.getPosition();
        const scrollTop = editorRef.current.getScrollTop();
        const model = editorRef.current.getModel();
        if (model && model.getValue() !== data.code) {
          model.setValue(data.code);
          if (pos) editorRef.current.setPosition(pos);
          editorRef.current.setScrollTop(scrollTop);
        }
      } else {
        setCode(data.code);
      }
    });

    // Turn handover initiated: lock floor
    socket.on('SWITCH_LOCKED', (data: { message?: string }) => {
      console.log('Turn switch locked:', data);
      setIsHandoverLocked(true);
      setHandoverMessage(data.message || 'Turn switch in progress. Editor locked.');
    });

    // Turn handover completed: unlock floor, swap writer, update timer
    socket.on('SWITCH_COMPLETE', (data: {
      newEditorId: string;
      newEditorUsername: string;
      genId: number;
      code: string;
      turnDeadline?: number;
    }) => {
      console.log('Turn switch completed. New writer:', data.newEditorUsername);
      setActiveEditorId(data.newEditorId);
      setLockGen(data.genId);
      if (data.code !== undefined && data.code !== null) {
        setCode(data.code);
        if (editorRef.current) {
          const model = editorRef.current.getModel();
          if (model) model.setValue(data.code);
        }
      }
      if (data.turnDeadline) {
        setTurnDeadline(data.turnDeadline);
      }
      setIsHandoverLocked(false);
      setHandoverMessage('');
    });

    // Real-time Submission Broadcasts (Evaluated via BullMQ / Judge0)
    socket.on('SUBMISSION_QUEUED', (data: any) => {
      console.log('Teammate submitted code. Status: QUEUED', data);
      setIsSubmitting(true);
      setIsConsoleOpen(true);
      setConsoleTab('results');
      setSampleResults(null);
      setSubmissionResult({
        status: 'PROCESSING',
        message: 'Evaluating test cases against Judge0 sandbox...',
      });
    });

    socket.on('SUBMISSION_RESULT', (data: any) => {
      console.log('Submission evaluation complete:', data);
      setIsSubmitting(false);
      setSubmissionResult(data);
      setIsConsoleOpen(true);
      setConsoleTab('results');
      fetchSubmissionsHistory();
    });

    socket.on('disconnect', () => {
      setWsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [problemId, router]);

  // Language identifier mapper for backend Judge0 execution
  const getLanguageId = (lang: string): number => {
    switch (lang) {
      case 'python':
        return 71;
      case 'javascript':
        return 63;
      case 'cpp':
        return 54;
      case 'java':
        return 62;
      default:
        return 71;
    }
  };

  // Fetch past submissions history for this problem
  const fetchSubmissionsHistory = async () => {
    const token = localStorage.getItem('token');
    const targetProblemId = problem?.id || problemId;
    if (!token || !targetProblemId) return;
    try {
      const res = await axios.get(`http://localhost:4000/api/submissions/problem/${targetProblemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPastSubmissions(res.data.submissions || []);
    } catch (err) {
      console.warn('Failed to load past submissions', err);
    }
  };

  useEffect(() => {
    fetchSubmissionsHistory();
  }, [problemId, problem?.id]);

  // 5-second submission rate-limit countdown ticker
  useEffect(() => {
    if (submitCooldown <= 0) return;
    const interval = setInterval(() => {
      setSubmitCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [submitCooldown]);

  // Trigger dry-run against non-hidden sample testcases
  const handleRunCode = async () => {
    if (!isWriter || isRunningSample || isSubmitting || isHandoverLocked) return;
    setIsRunningSample(true);
    setConsoleTab('results');
    setIsConsoleOpen(true);
    setSubmissionResult(null);

    const token = localStorage.getItem('token');
    const targetProblemId = problem?.id || problemId;
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;

    try {
      const res = await axios.post(
        'http://localhost:4000/api/submissions/run',
        {
          problemId: targetProblemId,
          code: currentCode,
          languageId: getLanguageId(selectedLanguage),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSampleResults(res.data.results || []);
      setActiveSampleIndex(0);
    } catch (err: any) {
      setSampleResults([
        {
          index: 1,
          input: 'Sample test execution failed',
          expectedOutput: '',
          actualOutput: '',
          stderr: err.response?.data?.error || err.message || 'Execution failed',
          passed: false,
          status: 'Error',
        },
      ]);
    } finally {
      setIsRunningSample(false);
    }
  };

  // Trigger official submission against all testcases
  const handleSubmitSolution = async () => {
    if (!isWriter || isRunningSample || isSubmitting || isHandoverLocked || submitCooldown > 0) return;
    setIsSubmitting(true);
    setConsoleTab('results');
    setIsConsoleOpen(true);
    setSampleResults(null);
    setSubmissionResult({
      status: 'PROCESSING',
      message: 'Evaluating test cases against Judge0 sandbox...',
    });
    setSubmitCooldown(5);

    const token = localStorage.getItem('token');
    const targetProblemId = problem?.id || problemId;
    const currentCode = editorRef.current ? editorRef.current.getValue() : code;

    try {
      const res = await axios.post(
        'http://localhost:4000/api/submissions',
        {
          problemId: targetProblemId,
          code: currentCode,
          languageId: getLanguageId(selectedLanguage),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSubmissionResult(res.data.submission);
      fetchSubmissionsHistory();
    } catch (err: any) {
      setSubmissionResult({
        status: 'FAILED',
        compilerOutput: err.response?.data?.error || err.message || 'Failed to submit solution.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle local typing from active writer
  const handleEditorChange = (value: string | undefined) => {
    const updated = value || '';
    setCode(updated);

    // Only active writer emits changes to server
    if (activeEditorId && user?.id === activeEditorId && !isHandoverLocked) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('CODE_UPDATE', {
            code: updated,
            genId: lockGen,
          });
        }
      }, 150);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-sm text-zinc-400">Loading arena workspace...</span>
        </div>
      </div>
    );
  }

  // Geolocation Block Screen
  if (geoBlocked) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#141414] border border-red-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-950/80 border border-red-800 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-red-400">Physical Attendance Required</h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            HackSingWin is an in-person competitive event. Your current physical location is outside the authorized venue perimeter.
          </p>
          <div className="bg-black/60 p-4 rounded-xl border border-zinc-800 font-mono text-xs space-y-1 text-zinc-400">
            <div>Distance from Venue: <span className="text-red-400">{geoInfo?.distanceMeters} meters</span></div>
            <div>Allowed Radius: <span className="text-emerald-400">{geoInfo?.allowedRadiusMeters} meters</span></div>
          </div>
          <p className="text-[11px] text-zinc-500">
            Please connect to the venue WiFi and allow location permissions. Contact an organizer if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const teamName = typeof window !== 'undefined' ? localStorage.getItem('teamName') || 'Team' : 'Team';
  const teamCode = typeof window !== 'undefined' ? localStorage.getItem('teamCode') || 'CODE' : 'CODE';
  const isLeftWing = user?.seatSide === 'LEFT';
  const isWriter = Boolean(user?.id && activeEditorId && user.id === activeEditorId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans select-none">
      {/* Security Toast Warning */}
      {securityNotice && (
        <div className="bg-yellow-950/90 border-b border-yellow-700/80 text-yellow-300 px-6 py-2 text-xs font-mono flex items-center justify-between animate-in slide-in-from-top duration-200 z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span>{securityNotice}</span>
          </div>
          <span className="text-[10px] text-yellow-500">Anti-Cheat Monitor Active</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-zinc-800 bg-[#141414] px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/rounds')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Rounds</span>
          </button>

          {user?.role === 'ADMIN' && (
            <button
              onClick={() => router.push('/admin')}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded transition-colors"
            >
              Admin Console
            </button>
          )}

          <div className="h-4 w-px bg-zinc-800" />

          <HackSingWinAnimatedTitle size="nav" />

          <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded-full font-mono">
            {problem?.title || 'Two Sum'}
          </span>

          {/* PHYSICAL SEATING / WING BADGE */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1.5 border ${
              isLeftWing
                ? 'bg-blue-950/80 border-blue-600 text-blue-300'
                : 'bg-purple-950/80 border-purple-600 text-purple-300'
            }`}
          >
            <MapPin className="w-3 h-3" />
            <span>SEAT: {isLeftWing ? 'LEFT WING' : 'RIGHT WING'}</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Synchronized Turn Countdown Clock */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all ${
              timeLeftSeconds < 60
                ? 'bg-red-950/90 border-red-700 text-red-400 animate-pulse shadow-sm shadow-red-950'
                : timeLeftSeconds < 120
                ? 'bg-yellow-950/70 border-yellow-800 text-yellow-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
            title="Time remaining in current writer's turn"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>TURN: {formatTime(timeLeftSeconds)}</span>
          </div>

          {/* Tournament Leaderboard Button */}
          <button
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-yellow-950/40 border border-yellow-700/60 hover:border-yellow-500 hover:bg-yellow-900/40 text-yellow-300 transition-all cursor-pointer shadow-xs"
            title="View Tournament Leaderboard"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>LEADERBOARD</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          {/* WebSocket Status Indicator */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={wsConnected ? 'text-emerald-400' : 'text-red-400'}>
              {wsConnected ? 'GATEWAY LIVE' : 'CONNECTING'}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          {/* User Profile & Team */}
          <div className="flex flex-col items-end text-xs font-mono leading-tight">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <User className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold text-white">{user?.username}</span>
              <span className="text-zinc-500">({user?.role})</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-0.5">
              Team: <span className="text-red-400 font-semibold">{teamName}</span> ({teamCode})
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Problem Statement with FORENSIC ANTI-LEAK WATERMARK */}
        <div className="col-span-5 border-r border-zinc-800 p-6 overflow-y-auto max-h-[calc(100vh-3.5rem)] relative">
          {/* DYNAMIC ANTI-LEAK WATERMARK OVERLAY (ZERO EMOJIS, HIGH VISIBILITY) */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.14] flex flex-wrap gap-x-10 gap-y-14 items-center justify-around -rotate-12 z-0 p-4">
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                className="font-mono text-xs font-bold uppercase tracking-widest text-red-400/90 whitespace-nowrap border border-red-500/30 px-2.5 py-1 rounded-md"
              >
                {teamName} • {teamCode} • {user?.username} • [{user?.seatSide || 'LEFT'} WING]
              </div>
            ))}
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{problem?.title}</h2>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-md">
                [{problem?.difficulty}]
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
              <span>Time Limit: {problem?.timeLimitMs}ms</span>
              <span>•</span>
              <span>Memory Limit: {problem?.memoryLimitKb}KB</span>
            </div>

            <div className="border-t border-zinc-800 pt-4 prose prose-invert max-w-none text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">
              {problem?.description}
            </div>

            {/* Sample Test Cases */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Sample Test Cases
              </h3>
              {problem?.sampleTestCases?.length === 0 ? (
                <p className="text-xs text-zinc-500">No public sample test cases for this problem.</p>
              ) : (
                problem?.sampleTestCases?.map((tc: any, idx: number) => (
                  <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 font-mono text-xs space-y-2">
                    <div>
                      <span className="text-zinc-500">Input:</span>
                      <pre className="mt-1 text-zinc-300 bg-black/50 p-2 rounded">{tc.input}</pre>
                    </div>
                    <div>
                      <span className="text-zinc-500">Expected Output:</span>
                      <pre className="mt-1 text-emerald-400 bg-black/50 p-2 rounded">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: SYNCHRONIZED MONACO CODE EDITOR & FLOOR BANNER */}
        <div className="col-span-7 flex flex-col bg-[#111111] overflow-hidden relative">
          {/* Floor Control State Header */}
          <div className="h-12 border-b border-zinc-800 bg-[#181818] px-4 flex items-center justify-between">
            {/* Status Banner */}
            <div className="flex items-center gap-3">
              {isWriter ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-lg text-xs font-mono font-bold shadow-sm">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>YOU ARE THE WRITER • Floor Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1 bg-purple-950/80 border border-purple-700 text-purple-300 rounded-lg text-xs font-mono font-bold shadow-sm">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>SPECTATOR MODE • Teammate Is Writing</span>
                </div>
              )}

              <span className="text-[11px] font-mono text-zinc-500">
                Floor Lock: Gen {lockGen}
              </span>
            </div>

            {/* Action Buttons & Language Selector */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">Language:</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setSelectedLanguage(newLang);
                    const currentText = editorRef.current ? editorRef.current.getValue() : code;
                    const isDefaultOrEmpty =
                      !currentText.trim() ||
                      currentText.includes('Shared Monaco Editor') ||
                      currentText.includes('Solution Template') ||
                      currentText.includes('Two Sum Solution') ||
                      currentText.includes('Solution for');
                    if (isDefaultOrEmpty) {
                      const starter = getStarterCode(problem?.slug || problemId, newLang);
                      setCode(starter);
                      if (editorRef.current) {
                        const model = editorRef.current.getModel();
                        if (model) model.setValue(starter);
                      }
                      if (socketRef.current && socketRef.current.connected && isWriter) {
                        socketRef.current.emit('CODE_UPDATE', {
                          code: starter,
                          genId: lockGen,
                        });
                      }
                    }
                  }}
                  className="bg-[#0A0A0A] border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none"
                >
                  <option value="python">Python 3</option>
                  <option value="javascript">JavaScript (Node)</option>
                  <option value="cpp">C++ (GCC)</option>
                  <option value="java">Java</option>
                </select>
              </div>

              <div className="h-4 w-px bg-zinc-800" />

              {/* Run Sample Tests Button */}
              <button
                type="button"
                onClick={handleRunCode}
                disabled={!isWriter || isRunningSample || isSubmitting || isHandoverLocked}
                title={!isWriter ? 'Spectator Mode: Only the active writer can run code' : 'Run code against sample test cases'}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  isWriter && !isRunningSample && !isSubmitting && !isHandoverLocked
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 cursor-pointer shadow-xs'
                    : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800/80 cursor-not-allowed'
                }`}
              >
                {isRunningSample ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                    <span>Running Samples...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Run Code</span>
                  </>
                )}
              </button>

              {/* Submit Final Solution Button */}
              <button
                type="button"
                onClick={handleSubmitSolution}
                disabled={!isWriter || isRunningSample || isSubmitting || isHandoverLocked || submitCooldown > 0}
                title={
                  !isWriter
                    ? 'Spectator Mode: Only the active writer can submit code'
                    : submitCooldown > 0
                    ? `Rate limit active: wait ${submitCooldown}s`
                    : 'Submit solution for full official evaluation'
                }
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  isWriter && !isRunningSample && !isSubmitting && !isHandoverLocked && submitCooldown === 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 cursor-pointer'
                    : 'bg-zinc-900/60 text-zinc-600 border border-zinc-800/80 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                    <span>Evaluating...</span>
                  </>
                ) : submitCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-yellow-500" />
                    <span>Cooldown [0{submitCooldown}s]</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-white" />
                    <span>Submit Solution</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Container OR Blind Relay Waiting Screen */}
          <div className="flex-1 relative overflow-hidden">
            {/* Handover Overlay */}
            {isHandoverLocked && (
              <div className="absolute inset-0 bg-black/85 z-30 flex flex-col items-center justify-center space-y-3 p-6 text-center backdrop-blur-xs">
                <div className="w-12 h-12 rounded-full bg-yellow-950/80 border border-yellow-700 text-yellow-400 flex items-center justify-center animate-spin">
                  <RotateCw className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white font-mono">
                  [HANDOVER] Relay Turn Handover in Progress
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm font-mono">
                  {handoverMessage || 'The organizer has triggered a floor handover. The workspace is being saved to database and synchronized.'}
                </p>
              </div>
            )}

            {isWriter ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={selectedLanguage}
                value={code}
                onChange={handleEditorChange}
                onMount={(editor) => {
                  editorRef.current = editor;
                }}
                options={{
                  readOnly: isHandoverLocked,
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  cursorBlinking: 'smooth',
                  padding: { top: 12, bottom: 12 },
                  tabSize: 4,
                }}
              />
            ) : (
              /* Blind Relay Waiting Staging Screen */
              <div className="h-full bg-[#0D0D0D] flex flex-col items-center justify-center p-8 text-center select-none overflow-y-auto">
                <div className="max-w-md w-full bg-[#151515] border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
                  {/* Status Pill */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-950/80 border border-purple-800 text-purple-300 rounded-full text-xs font-mono font-bold">
                    <Eye className="w-3.5 h-3.5 text-purple-400" />
                    <span>[BLIND RELAY • CODE CONCEALED]</span>
                  </div>

                  {/* Main Message */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white font-mono tracking-wide">
                      Teammate Is Coding
                    </h3>
                    <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                      Under HackSingWin Blind Relay tournament rules, live keystrokes are hidden during your teammate&apos;s turn. The complete code will be revealed to you upon the next turn handover.
                    </p>
                  </div>

                  {/* Turn Countdown Display */}
                  <div className="bg-black/60 border border-zinc-800 rounded-xl p-4 font-mono space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block">
                      Estimated Time Until Your Shift
                    </span>
                    <div className="text-3xl font-black text-yellow-400 tracking-wider">
                      {formatTime(timeLeftSeconds)}
                    </div>
                  </div>

                  {/* Relay Strategy Tips */}
                  <div className="bg-[#111111] border border-zinc-800/80 rounded-xl p-4 text-left font-mono text-[11px] text-zinc-400 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                      While Waiting — Staging Checklist:
                    </span>
                    <ul className="space-y-1.5 list-disc list-inside text-zinc-400">
                      <li>Read the problem statement and edge constraints on the left pane.</li>
                      <li>Formulate corner test cases (zero, negative, bounds).</li>
                      <li>Plan algorithmic time &amp; memory complexity.</li>
                      <li>Be prepared to take over immediately upon handover.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Execution Console Panel */}
          <div className="border-t border-zinc-800 bg-[#141414] flex flex-col transition-all duration-200">
            {/* Console Tabs Bar */}
            <div className="h-10 px-4 flex items-center justify-between border-b border-zinc-800/80 bg-[#161616]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConsoleTab('results');
                    setIsConsoleOpen(true);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                    consoleTab === 'results' && isConsoleOpen
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Play className="w-3 h-3 text-emerald-400" />
                  <span>Test Results</span>
                  {sampleResults && (
                    <span className="text-[10px] px-1.5 py-0.2 bg-zinc-900 border border-zinc-700 rounded text-zinc-300">
                      {sampleResults.filter((r) => r.passed).length}/{sampleResults.length}
                    </span>
                  )}
                  {submissionResult && submissionResult.status !== 'PROCESSING' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                        submissionResult.status === 'ACCEPTED'
                          ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                          : 'bg-red-950 border-red-700 text-red-300'
                      }`}
                    >
                      {submissionResult.status}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConsoleTab('compiler');
                    setIsConsoleOpen(true);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                    consoleTab === 'compiler' && isConsoleOpen
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Terminal className="w-3 h-3 text-yellow-400" />
                  <span>Compiler Output</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConsoleTab('history');
                    setIsConsoleOpen(true);
                    fetchSubmissionsHistory();
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                    consoleTab === 'history' && isConsoleOpen
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <History className="w-3 h-3 text-blue-400" />
                  <span>Submissions ({pastSubmissions.length})</span>
                </button>
              </div>

              {/* Console Toggle Button */}
              <button
                type="button"
                onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
                title={isConsoleOpen ? 'Collapse console' : 'Expand console'}
              >
                {isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Console Content Area */}
            {isConsoleOpen && (
              <div className="h-56 p-4 overflow-y-auto font-mono text-xs bg-[#0F0F0F] text-zinc-300">
                {/* 1. TEST RESULTS TAB */}
                {consoleTab === 'results' && (
                  <div className="h-full">
                    {/* Official Submission Verdict Card */}
                    {submissionResult ? (
                      <div className="space-y-4">
                        <div
                          className={`p-4 rounded-xl border flex items-center justify-between ${
                            submissionResult.status === 'PROCESSING'
                              ? 'bg-yellow-950/30 border-yellow-800/60 text-yellow-200'
                              : submissionResult.status === 'ACCEPTED'
                              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                              : 'bg-red-950/30 border-red-800/60 text-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {submissionResult.status === 'PROCESSING' ? (
                              <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                            ) : submissionResult.status === 'ACCEPTED' ? (
                              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                            ) : (
                              <XCircle className="w-6 h-6 text-red-400" />
                            )}

                            <div>
                              <div className="text-sm font-bold tracking-wide">
                                {submissionResult.status === 'PROCESSING'
                                  ? 'Evaluating Official Submission...'
                                  : `Official Verdict: ${submissionResult.status}`}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5">
                                {submissionResult.status === 'PROCESSING'
                                  ? submissionResult.message || 'Executing against test suite via Judge0 CE'
                                  : `Submitted by ${submissionResult.username || 'writer'} • Problem: ${problem?.title}`}
                              </div>
                            </div>
                          </div>

                          {submissionResult.status !== 'PROCESSING' && (
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <div className="text-xs text-zinc-400">Score</div>
                                <div className="text-base font-bold text-emerald-400">
                                  {submissionResult.score || 0} pts
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-zinc-400">Tests Passed</div>
                                <div className="text-base font-bold text-white">
                                  {submissionResult.testCasesPassed || 0} / {submissionResult.totalTestCases || 0}
                                </div>
                              </div>
                              {submissionResult.timeMs && (
                                <div>
                                  <div className="text-xs text-zinc-400">Runtime</div>
                                  <div className="text-sm font-bold text-zinc-300">
                                    {submissionResult.timeMs}ms
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {submissionResult.compilerOutput && (
                          <div className="bg-black/60 border border-zinc-800 rounded-xl p-3">
                            <span className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                              Diagnostic Trace:
                            </span>
                            <pre className="text-xs text-red-400 whitespace-pre-wrap">
                              {submissionResult.compilerOutput}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : sampleResults ? (
                      /* Sample Dry Run Results */
                      <div className="space-y-4">
                        {/* Sample Case Pills */}
                        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                          {sampleResults.map((res, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setActiveSampleIndex(idx)}
                              className={`px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors ${
                                activeSampleIndex === idx
                                  ? 'bg-zinc-800 text-white border border-zinc-600'
                                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                              }`}
                            >
                              {res.passed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span>Case {res.index}</span>
                            </button>
                          ))}
                        </div>

                        {/* Active Sample Case Details */}
                        {sampleResults[activeSampleIndex] && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <span className="text-[11px] text-zinc-500 font-bold uppercase">Input:</span>
                                <pre className="bg-black/70 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                                  {sampleResults[activeSampleIndex].input}
                                </pre>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[11px] text-zinc-500 font-bold uppercase">Your Output:</span>
                                <pre
                                  className={`border rounded-lg p-2.5 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto font-mono ${
                                    sampleResults[activeSampleIndex].passed
                                      ? 'bg-black/70 border-emerald-900/60 text-emerald-300'
                                      : 'bg-black/70 border-red-900/60 text-red-300'
                                  }`}
                                >
                                  {sampleResults[activeSampleIndex].actualOutput || '(no stdout output)'}
                                </pre>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[11px] text-zinc-500 font-bold uppercase">Expected Output:</span>
                                <pre className="bg-black/70 border border-zinc-800 rounded-lg p-2.5 text-xs text-emerald-400 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                                  {sampleResults[activeSampleIndex].expectedOutput}
                                </pre>
                              </div>
                            </div>

                            {sampleResults[activeSampleIndex].stderr && (
                              <div className="bg-red-950/40 border border-red-800/80 rounded-lg p-2.5 space-y-1 font-mono">
                                <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide block">
                                  Runtime Error / Stderr:
                                </span>
                                <pre className="text-xs text-red-300 whitespace-pre-wrap max-h-24 overflow-y-auto">
                                  {sampleResults[activeSampleIndex].stderr}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty Console State */
                      <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-2">
                        <Terminal className="w-8 h-8 text-zinc-700" />
                        <p className="text-xs font-mono">
                          Ready for execution. Click <strong>&quot;Run Code&quot;</strong> to test sample cases or <strong>&quot;Submit Solution&quot;</strong> for full evaluation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. COMPILER OUTPUT TAB */}
                {consoleTab === 'compiler' && (
                  <div className="h-full">
                    {submissionResult?.compilerOutput || sampleResults?.some((r) => r.stderr) ? (
                      <pre className="text-xs text-red-400 bg-black/70 border border-zinc-800 p-3 rounded-lg whitespace-pre-wrap">
                        {submissionResult?.compilerOutput ||
                          sampleResults?.find((r) => r.stderr)?.stderr ||
                          'Execution clean with zero compiler errors.'}
                      </pre>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-zinc-600" />
                        <span className="text-xs">No compiler diagnostics or runtime stderr reported.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. SUBMISSIONS HISTORY TAB */}
                {consoleTab === 'history' && (
                  <div>
                    {pastSubmissions.length === 0 ? (
                      <div className="py-8 text-center text-zinc-500">
                        No submissions recorded yet for this problem.
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                            <th className="py-2 px-3">Verdict</th>
                            <th className="py-2 px-3">Tests Passed</th>
                            <th className="py-2 px-3">Score</th>
                            <th className="py-2 px-3">Runtime</th>
                            <th className="py-2 px-3">Submitted By</th>
                            <th className="py-2 px-3 text-right">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastSubmissions.map((sub: any) => (
                            <tr key={sub.id} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    sub.status === 'ACCEPTED'
                                      ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                                      : 'bg-red-950 border-red-700 text-red-300'
                                  }`}
                                >
                                  {sub.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300">
                                {sub.testCasesPassed} / {sub.totalTestCases}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-emerald-400">
                                {sub.score} pts
                              </td>
                              <td className="py-2.5 px-3 text-zinc-400">
                                {sub.timeMs ? `${sub.timeMs}ms` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-zinc-300">
                                {sub.user?.username || 'Writer'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-zinc-500 text-[11px]">
                                {new Date(sub.createdAt).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tournament Leaderboard Drawer */}
      <LeaderboardDrawer
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentTeamId={user?.teamId}
        socket={socketRef.current}
      />
    </div>
  );
}
