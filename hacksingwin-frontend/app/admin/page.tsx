'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
  Shield,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Trash2,
  RefreshCw,
  LogOut,
  MapPin,
  Compass,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Code2,
  Play,
  RotateCw,
  Server,
  Layers,
  Plus,
  ArrowRight,
  X,
  Activity,
  Clock,
  Trophy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { io } from 'socket.io-client';
import HackSingWinAnimatedTitle from '@/components/HackSingWinAnimatedTitle';

interface Member {
  id: string;
  username: string;
  role: string;
  seatSide?: string;
}

interface Team {
  id: string;
  name: string;
  teamCode: string;
  currentEditorId: string;
  lockGeneration: number;
  members: Member[];
  submissionCount: number;
  createdAt: string;
}

interface ContestRound {
  id: number;
  title: string;
  description: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
  durationMin: number;
  problems: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    timeLimitMs: number;
  }[];
}

interface TestCaseDraft {
  input: string;
  isHidden: boolean;
  expectedOutput?: string;
  error?: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<ContestRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'rounds' | 'problem' | 'telemetry' | 'single' | 'bulk' | 'security' | 'list'>('rounds');

  // Live Telemetry & Turn Timer State
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);
  const [turnDurationSeconds, setTurnDurationSeconds] = useState<number>(300);
  const [savingTurnTimer, setSavingTurnTimer] = useState<boolean>(false);

  // Leaderboard Participant Reveal State
  const [isLeaderboardRevealed, setIsLeaderboardRevealed] = useState<boolean>(false);

  // Dynamic Round Creation Modal / Form State
  const [showNewRoundModal, setShowNewRoundModal] = useState(false);
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundDesc, setNewRoundDesc] = useState('');
  const [newRoundDuration, setNewRoundDuration] = useState(45);
  const [newRoundStatus, setNewRoundStatus] = useState<'LOCKED' | 'ACTIVE' | 'UPCOMING'>('LOCKED');
  const [creatingRound, setCreatingRound] = useState(false);

  // Single Team State
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [m1User, setM1User] = useState('');
  const [m1Pass, setM1Pass] = useState('');
  const [m2User, setM2User] = useState('');
  const [m2Pass, setM2Pass] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  // Bulk Import State
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Geolocation Settings
  const [geoLockEnabled, setGeoLockEnabled] = useState(false);
  const [venueLat, setVenueLat] = useState<string>('');
  const [venueLng, setVenueLng] = useState<string>('');
  const [allowedRadius, setAllowedRadius] = useState<number>(300);
  const [savingSettings, setSavingSettings] = useState(false);

  // AWS Judge0 Status
  const [judge0Status, setJudge0Status] = useState<any>(null);
  const [checkingJudge0, setCheckingJudge0] = useState(false);

  // Problem Authoring Form State
  const [probTargetRound, setProbTargetRound] = useState<number>(1);
  const [probTitle, setProbTitle] = useState('');
  const [probSlug, setProbSlug] = useState('');
  const [probDifficulty, setProbDifficulty] = useState('EASY');
  const [probTimeLimit, setProbTimeLimit] = useState(2000);
  const [probMemLimit, setProbMemLimit] = useState(262144);
  const [probDescription, setProbDescription] = useState('');
  const [probLangId, setProbLangId] = useState<number>(71); // Python 3
  const [probSolutionCode, setProbSolutionCode] = useState('n = int(input())\nprint(n * 2)');
  const [probTestCases, setProbTestCases] = useState<TestCaseDraft[]>([
    { input: '5', isHidden: false },
    { input: '10', isHidden: true },
  ]);
  const [previewingOutputs, setPreviewingOutputs] = useState(false);
  const [authoringProblem, setAuthoringProblem] = useState(false);

  // Load all initial data
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');

    if (!token || role !== 'ADMIN') {
      router.push('/login');
      return;
    }

    try {
      setLoading(true);
      const [teamsRes, settingsRes, roundsRes, judge0Res, telemetryRes, turnTimerRes, leaderboardRes] = await Promise.all([
        axios.get('http://localhost:4000/api/admin/teams', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:4000/api/admin/settings', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://localhost:4000/api/rounds'),
        axios.get('http://localhost:4000/api/admin/judge0-status', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { online: false, error: 'Unreachable' } })),
        axios.get('http://localhost:4000/api/admin/telemetry', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { logs: [] } })),
        axios.get('http://localhost:4000/api/admin/turn-timer', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { durationSeconds: 300 } })),
        axios.get('http://localhost:4000/api/leaderboard/live', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { isRevealedToParticipants: false } })),
      ]);

      setTeams(teamsRes.data.teams || []);
      const fetchedRounds = roundsRes.data.rounds || [];
      setRounds(fetchedRounds);
      if (fetchedRounds.length > 0 && !fetchedRounds.some((r: any) => r.id === probTargetRound)) {
        setProbTargetRound(fetchedRounds[0].id);
      }
      setJudge0Status(judge0Res.data);
      setTelemetryLogs(telemetryRes.data.logs || []);
      if (turnTimerRes.data.durationSeconds) {
        setTurnDurationSeconds(turnTimerRes.data.durationSeconds);
      }
      setIsLeaderboardRevealed(Boolean(leaderboardRes.data?.isRevealedToParticipants));

      const s = settingsRes.data.settings;
      if (s) {
        setGeoLockEnabled(Boolean(s.geoLockEnabled));
        setVenueLat(s.venueLat !== null ? s.venueLat.toString() : '');
        setVenueLng(s.venueLng !== null ? s.venueLng.toString() : '');
        setAllowedRadius(s.allowedRadiusMeters || 300);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const token = localStorage.getItem('token');
    if (!token) return;

    const socket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('TELEMETRY_ALERT', (alert: any) => {
      setTelemetryLogs((prev) => [alert, ...prev.slice(0, 49)]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSaveTurnTimer = async () => {
    setSavingTurnTimer(true);
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:4000/api/admin/turn-timer',
        { durationSeconds: turnDurationSeconds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Turn duration updated to ${Math.floor(turnDurationSeconds / 60)}m ${turnDurationSeconds % 60}s (${turnDurationSeconds} seconds).`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update turn timer.');
    } finally {
      setSavingTurnTimer(false);
    }
  };

  const pingJudge0 = async () => {
    setCheckingJudge0(true);
    const token = localStorage.getItem('token');
    try {
      const res = await axios.get('http://localhost:4000/api/admin/judge0-status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJudge0Status(res.data);
      setSuccess('AWS Judge0 status refreshed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setJudge0Status({ online: false, error: 'Could not connect to Judge0' });
    } finally {
      setCheckingJudge0(false);
    }
  };

  // Helper generators
  const generateRandomCode = (prefix = 'TEAM') => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}_${res}`;
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijkmnpqrstuvwxyz23456789!@#$';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleAutoFillForm = () => {
    const randomSuffix = Math.floor(10 + Math.random() * 90);
    setTeamName(`Squad_${randomSuffix}`);
    setTeamCode(`CODE_${randomSuffix}`);
    setM1User(`player_${randomSuffix}_a`);
    setM1Pass(generateRandomPassword());
    setM2User(`player_${randomSuffix}_b`);
    setM2Pass(generateRandomPassword());
  };

  // Capture GPS
  const handleCaptureCurrentGPS = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVenueLat(pos.coords.latitude.toFixed(6));
        setVenueLng(pos.coords.longitude.toFixed(6));
        setSuccess('Venue coordinates captured from current GPS location.');
        setTimeout(() => setSuccess(''), 3000);
      },
      (err) => {
        setError(`Could not fetch GPS: ${err.message}.`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Save Contest Geolocation Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/admin/settings',
        {
          geoLockEnabled,
          venueLat: venueLat ? parseFloat(venueLat) : null,
          venueLng: venueLng ? parseFloat(venueLng) : null,
          allowedRadiusMeters: allowedRadius,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const s = res.data.settings;
      setGeoLockEnabled(Boolean(s.geoLockEnabled));
      setSuccess('Venue geolocation and perimeter settings updated successfully.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Create a Dynamic Round
  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) {
      setError('Round title is required.');
      return;
    }

    setCreatingRound(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await axios.post(
        'http://localhost:4000/api/rounds/create',
        {
          title: newRoundTitle.trim(),
          description: newRoundDesc.trim() || undefined,
          durationMin: newRoundDuration || 45,
          status: newRoundStatus,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Stage #${res.data.round.id} ("${res.data.round.title}") created successfully.`);
      setNewRoundTitle('');
      setNewRoundDesc('');
      setShowNewRoundModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create round');
    } finally {
      setCreatingRound(false);
    }
  };

  // Update Specific Round Status
  const handleUpdateRoundStatus = async (roundId: number, status: string) => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:4000/api/rounds/update',
        { roundId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Stage #${roundId} updated to [${status}]. Live participant browsers updated.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update round');
    }
  };

  // Bulk Lock or Unlock All Rounds
  const handleBulkRoundsStatus = async (action: 'LOCK_ALL' | 'UNLOCK_ALL') => {
    const token = localStorage.getItem('token');
    try {
      await axios.post(
        'http://localhost:4000/api/rounds/bulk-status',
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(
        action === 'UNLOCK_ALL'
          ? 'All contest stages UNLOCKED. Participants can now access all rounds.'
          : 'All contest stages LOCKED. Participant access restricted.'
      );
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to bulk update rounds');
    }
  };

  // Delete a Round
  const handleDeleteRound = async (roundId: number, title: string) => {
    if (!confirm(`Delete stage #${roundId} ("${title}")? Problems in this stage will be unlinked.`)) return;
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:4000/api/rounds/${roundId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(`Stage #${roundId} deleted.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete round');
    }
  };

  // Trigger Individual Turn Switch
  const handleSwitchTeamTurn = async (teamId: string, teamName: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/admin/switch-turn',
        { teamId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Turn switched for team "${teamName}". Next writer: ${res.data.newEditorUsername} (Gen ${res.data.genId}).`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to switch turn');
    }
  };

  // Trigger Global Turn Switch
  const handleGlobalSwitchTurn = async () => {
    if (!confirm('Are you sure you want to trigger a simultaneous turn handover for ALL teams?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/admin/switch-turn',
        { all: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`Global turn switch executed across ${res.data.count} teams.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to execute global turn switch');
    }
  };

  // Single Team Creation
  const handleCreateSingleTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamCode || !m1User || !m1Pass || !m2User || !m2Pass) {
      setError('Please fill all fields for Team Name, Team Code, and both members');
      return;
    }

    setCreatingTeam(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/admin/teams/create',
        {
          teamName: teamName.trim(),
          teamCode: teamCode.trim().toUpperCase(),
          member1: { username: m1User.trim(), password: m1Pass },
          member2: { username: m2User.trim(), password: m2Pass },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Team "${res.data.team.name}" provisioned with Left & Right Wing seats assigned.`);
      setTeamName('');
      setTeamCode('');
      setM1User('');
      setM1Pass('');
      setM2User('');
      setM2Pass('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create team');
    } finally {
      setCreatingTeam(false);
    }
  };

  // Bulk CSV Import
  const handleBulkProvision = async () => {
    if (!bulkText.trim()) {
      setError('Please paste team lines in the format: TeamName,TeamCode,User1,Pass1,User2,Pass2');
      return;
    }

    setBulkLoading(true);
    setError('');
    setSuccess('');

    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#'));

    const parsedTeams: any[] = [];
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length >= 6) {
        parsedTeams.push({
          teamName: parts[0],
          teamCode: parts[1].toUpperCase(),
          member1: { username: parts[2], password: parts[3] },
          member2: { username: parts[4], password: parts[5] },
        });
      }
    }

    if (parsedTeams.length === 0) {
      setError('No valid lines found. Expected format: TeamName,TeamCode,User1,Pass1,User2,Pass2');
      setBulkLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const res = await axios.post(
        'http://localhost:4000/api/admin/teams/batch',
        { teams: parsedTeams },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Batch complete. Successfully provisioned ${res.data.success.length} teams.`);
      setBulkText('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Batch provisioning failed');
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete Team
  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!confirm(`Delete team "${name}" and all associated data?`)) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:4000/api/admin/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(`Team "${name}" deleted.`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete team');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (teams.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Team Name,Team Code,Member 1 (Left Wing),Member 2 (Right Wing),Initial Writer\n';

    teams.forEach((t) => {
      const m1 = t.members[0]?.username || '';
      const m2 = t.members[1]?.username || '';
      const initialWriter = t.currentEditorId === t.members[0]?.id ? m1 : m2;
      csvContent += `"${t.name}","${t.teamCode}","${m1} (LEFT)","${m2} (RIGHT)","${initialWriter}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hacksingwin_teams_seating_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle Leaderboard Reveal to Participants
  const handleToggleLeaderboardReveal = async () => {
    const token = localStorage.getItem('token');
    try {
      const nextState = !isLeaderboardRevealed;
      const res = await axios.post(
        'http://localhost:4000/api/leaderboard/toggle-reveal',
        { revealed: nextState },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsLeaderboardRevealed(res.data.isRevealed);
      setSuccess(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle leaderboard reveal');
    }
  };

  // Add / Remove Test Case Draft Row
  const handleAddTestCaseDraft = () => {
    setProbTestCases([...probTestCases, { input: '', isHidden: false }]);
  };

  const handleRemoveTestCaseDraft = (index: number) => {
    setProbTestCases(probTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateTestCaseDraft = (index: number, field: keyof TestCaseDraft, value: any) => {
    const updated = [...probTestCases];
    updated[index] = { ...updated[index], [field]: value };
    setProbTestCases(updated);
  };

  // Preview Outputs via Judge0
  const handlePreviewOutputs = async () => {
    if (!probSolutionCode.trim()) {
      setError('Please provide reference solution code.');
      return;
    }
    if (probTestCases.length === 0) {
      setError('Please provide at least one testcase input.');
      return;
    }

    setPreviewingOutputs(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await axios.post(
        'http://localhost:4000/api/problems/preview-outputs',
        {
          sourceCode: probSolutionCode,
          languageId: probLangId,
          testCases: probTestCases.map((tc) => ({ input: tc.input, isHidden: tc.isHidden })),
          timeLimitMs: probTimeLimit,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const evaluated = res.data.results;
      setProbTestCases(
        evaluated.map((r: any) => ({
          input: r.input,
          isHidden: r.isHidden,
          expectedOutput: r.expectedOutput,
          error: r.error,
        }))
      );
      setSuccess(`Outputs evaluated successfully for ${evaluated.length} testcase(s).`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to preview testcase outputs.');
    } finally {
      setPreviewingOutputs(false);
    }
  };

  // Save Problem to Round
  const handleSaveProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!probTitle.trim() || !probDescription.trim() || !probSolutionCode.trim()) {
      setError('Problem title, description, and solution code are required.');
      return;
    }
    if (probTestCases.length === 0) {
      setError('At least one testcase input is required.');
      return;
    }

    setAuthoringProblem(true);
    setError('');
    const token = localStorage.getItem('token');

    try {
      const res = await axios.post(
        'http://localhost:4000/api/problems/author',
        {
          title: probTitle.trim(),
          slug: probSlug.trim() || undefined,
          description: probDescription.trim(),
          difficulty: probDifficulty,
          roundId: probTargetRound,
          timeLimitMs: probTimeLimit,
          memoryLimitKb: probMemLimit,
          sourceCode: probSolutionCode,
          languageId: probLangId,
          testCases: probTestCases.map((tc) => ({ input: tc.input, isHidden: tc.isHidden })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Problem "${res.data.problem.title}" published to Stage #${probTargetRound} with ${res.data.evaluatedCount} verified testcases.`);
      setProbTitle('');
      setProbSlug('');
      setProbDescription('');
      setProbTestCases([
        { input: '', isHidden: false },
        { input: '', isHidden: true },
      ]);
      fetchData();
      setActiveTab('rounds');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to author problem.');
    } finally {
      setAuthoringProblem(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="h-16 border-b border-zinc-800 bg-[#141414] px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-red-950/70 border border-red-800 text-red-500 rounded-xl flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HackSingWinAnimatedTitle size="nav" />
              <span className="text-[10px] bg-red-900/60 border border-red-700 text-red-300 px-2 py-0.5 rounded-full font-mono">
                ADMIN CONSOLE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Dynamic Stage Configuration, AWS Judge0 Authoring & Seating</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* AWS Judge0 Engine Status Pill */}
          <button
            onClick={pingJudge0}
            disabled={checkingJudge0}
            title="Click to re-ping AWS Judge0 Engine"
            className={`px-3 py-1 text-[11px] font-mono rounded-lg border flex items-center gap-1.5 transition-colors ${
              judge0Status?.online
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-zinc-900 border-zinc-700 text-yellow-400'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>
              {checkingJudge0
                ? 'Pinging...'
                : judge0Status?.online
                ? 'AWS Judge0: Online'
                : 'Judge0: Local Fallback Active'}
            </span>
          </button>

          <button
            onClick={fetchData}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg text-xs flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Banner Alert Messages */}
        {error && (
          <div className="p-4 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Selection Bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 overflow-x-auto gap-2">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('rounds')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'rounds'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Contest Stages ({rounds.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('problem')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'problem'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Author Problem (Judge0)</span>
            </button>

            <button
              onClick={() => setActiveTab('single')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'single'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Team</span>
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'bulk'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk CSV Import</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Venue Geofence</span>
            </button>

            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'telemetry'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Live Telemetry & Timer</span>
              {telemetryLogs.length > 0 && (
                <span className="px-1.5 py-0.5 bg-red-950/80 border border-red-700 text-red-300 text-[10px] rounded-full font-mono font-semibold">
                  {telemetryLogs.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open('/admin/presentation', '_blank')}
              className="px-3.5 py-2 bg-gradient-to-r from-yellow-950/60 to-amber-950/60 hover:from-yellow-900/70 hover:to-amber-900/70 border border-yellow-600/60 text-yellow-300 text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-md shadow-yellow-950/30 cursor-pointer"
              title="Open Fullscreen Big-Screen Stage Presentation Feed for Projector"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Stage Projector Feed</span>
            </button>

            <button
              onClick={handleToggleLeaderboardReveal}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg flex items-center gap-2 border transition-colors cursor-pointer ${
                isLeaderboardRevealed
                  ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
              }`}
              title="Toggle whether participants can view the scoreboard"
            >
              {isLeaderboardRevealed ? (
                <>
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <span>Standings: Revealed</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4 text-zinc-400" />
                  <span>Standings: Concealed</span>
                </>
              )}
            </button>

            <button
              onClick={handleGlobalSwitchTurn}
              className="px-3.5 py-2 bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-800/80 text-yellow-300 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              title="Simultaneously handover the floor for all participating teams"
            >
              <RotateCw className="w-4 h-4" />
              <span>Global Turn Switch</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={teams.length === 0}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-50 text-xs font-bold rounded-lg flex items-center gap-2 text-zinc-200 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Roster CSV</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
           TAB: GENERALIZED CONTEST STAGES & ROUNDS CONFIGURATION
           ========================================================================= */}
        {activeTab === 'rounds' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-red-500" />
                  <span>Dynamic Contest Stages Configuration</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Configure any number of stages. Lock or unlock rounds to control participant access in real time upon login.
                </p>
              </div>

              {/* Action Bar for Rounds */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkRoundsStatus('UNLOCK_ALL')}
                  className="px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700 text-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Unlock all stages so participants can access all rounds"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock All Stages</span>
                </button>

                <button
                  onClick={() => handleBulkRoundsStatus('LOCK_ALL')}
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Lock all stages to restrict participant access"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock All Stages</span>
                </button>

                <button
                  onClick={() => setShowNewRoundModal(!showNewRoundModal)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-red-600/30 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Stage</span>
                </button>
              </div>
            </div>

            {/* Inline Stage Creation Card */}
            {showNewRoundModal && (
              <div className="bg-[#181818] border border-red-900/60 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-red-500" />
                    <span>Configure New Contest Stage</span>
                  </h3>
                  <button
                    onClick={() => setShowNewRoundModal(false)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateRound} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Stage Title
                      </label>
                      <input
                        type="text"
                        value={newRoundTitle}
                        onChange={(e) => setNewRoundTitle(e.target.value)}
                        placeholder="e.g. Round 3: Sudden Death Tiebreaker"
                        className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Allocated Duration (Minutes)
                      </label>
                      <input
                        type="number"
                        value={newRoundDuration}
                        onChange={(e) => setNewRoundDuration(parseInt(e.target.value, 10) || 45)}
                        className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Description / Objective
                      </label>
                      <input
                        type="text"
                        value={newRoundDesc}
                        onChange={(e) => setNewRoundDesc(e.target.value)}
                        placeholder="e.g. Advanced algorithmic relay finale for top 8 squads"
                        className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                        Initial Access Status
                      </label>
                      <select
                        value={newRoundStatus}
                        onChange={(e) => setNewRoundStatus(e.target.value as any)}
                        className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-red-500"
                      >
                        <option value="LOCKED">LOCKED (Hidden / Inaccessible)</option>
                        <option value="ACTIVE">ACTIVE (Unlocked & Accessible Now)</option>
                        <option value="UPCOMING">UPCOMING (Preview / Starting Soon)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowNewRoundModal(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingRound}
                      className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      {creatingRound ? 'Configuring Stage...' : 'Add Stage to Tournament'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Dynamic Stage Cards Grid */}
            {rounds.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl space-y-2 bg-[#141414]">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-xs text-zinc-400">No stages configured yet.</p>
                <button
                  onClick={() => setShowNewRoundModal(true)}
                  className="text-xs text-red-400 hover:underline font-bold"
                >
                  Create your first stage now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rounds.map((round) => {
                  const isLive = round.status === 'ACTIVE';
                  const isLocked = round.status === 'LOCKED';
                  const isCompleted = round.status === 'COMPLETED';

                  return (
                    <div
                      key={round.id}
                      className={`bg-[#141414] border rounded-2xl p-6 space-y-4 flex flex-col justify-between transition-all ${
                        isLive
                          ? 'border-emerald-700/80 shadow-lg shadow-emerald-950/20'
                          : isLocked
                          ? 'border-zinc-800/80 bg-zinc-950/50'
                          : isCompleted
                          ? 'border-zinc-800 opacity-75'
                          : 'border-zinc-800'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <span className="text-xs font-mono font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded">
                            STAGE {round.id < 10 ? `0${round.id}` : round.id}
                          </span>

                          <span
                            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full border ${
                              isLive
                                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                                : isLocked
                                ? 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                : isCompleted
                                ? 'bg-zinc-900 text-zinc-400 border-zinc-700'
                                : 'bg-yellow-950/70 text-yellow-400 border-yellow-800'
                            }`}
                          >
                            [{round.status}]
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-white">{round.title}</h3>
                          {round.description && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                              {round.description}
                            </p>
                          )}
                        </div>

                        <div className="bg-[#0A0A0A] p-3 rounded-xl border border-zinc-800/80 space-y-1.5 text-xs font-mono">
                          <div className="flex justify-between text-zinc-400">
                            <span>Duration:</span>
                            <span className="text-white font-bold">{round.durationMin} mins</span>
                          </div>
                          <div className="flex justify-between text-zinc-400">
                            <span>Challenges:</span>
                            <span className="text-white font-bold">{round.problems?.length || 0}</span>
                          </div>
                        </div>

                        {/* Problems list */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">Assigned Challenges:</span>
                          {round.problems?.length === 0 ? (
                            <p className="text-xs text-zinc-600 italic p-1">None yet. Author problem below.</p>
                          ) : (
                            round.problems.map((p) => (
                              <div key={p.id} className="p-2 bg-zinc-900/70 border border-zinc-800/80 rounded-lg text-xs flex justify-between items-center">
                                <span className="text-zinc-300 font-medium truncate max-w-[180px]">{p.title}</span>
                                <span className="text-[10px] font-mono text-zinc-500">[{p.difficulty}]</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Stage Action Controls */}
                      <div className="pt-3 border-t border-zinc-800 flex items-center gap-2">
                        {isLocked ? (
                          <button
                            onClick={() => handleUpdateRoundStatus(round.id, 'ACTIVE')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unlock Stage</span>
                          </button>
                        ) : isLive ? (
                          <>
                            <button
                              onClick={() => handleUpdateRoundStatus(round.id, 'LOCKED')}
                              className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-yellow-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Stage</span>
                            </button>
                            <button
                              onClick={() => handleUpdateRoundStatus(round.id, 'COMPLETED')}
                              className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded-xl text-xs transition-colors"
                            >
                              <span>Conclude</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateRoundStatus(round.id, 'ACTIVE')}
                            className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Launch Stage</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteRound(round.id, round.title)}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors"
                          title="Delete Stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
           TAB: AUTHOR PROBLEM & AUTO-GENERATE TESTCASES VIA JUDGE0
           ========================================================================= */}
        {activeTab === 'problem' && (
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-red-500" />
                  <span>Problem Authoring & Automated Test Case Evaluation</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Supply constraints, reference solution code, and input test cases. Judge0 automatically executes the solution to set authoritative test outputs.
                </p>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-mono text-zinc-400 block">Execution Backend:</span>
                <span className={`text-xs font-mono font-bold ${judge0Status?.online ? 'text-emerald-400' : 'text-yellow-400'}`}>
                  {judge0Status?.online ? 'AWS Judge0 CE (Remote)' : 'Local Engine Fallback'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProblem} className="space-y-6">
              {/* Row 1: Target Round, Title, Slug, Difficulty */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Target Stage / Round
                  </label>
                  <select
                    value={probTargetRound}
                    onChange={(e) => setProbTargetRound(parseInt(e.target.value, 10))}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-red-500"
                  >
                    {rounds.length === 0 ? (
                      <option value={1}>Stage 1 (Default)</option>
                    ) : (
                      rounds.map((r) => (
                        <option key={r.id} value={r.id}>
                          Stage #{r.id}: {r.title} [{r.status}]
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Problem Title
                  </label>
                  <input
                    type="text"
                    value={probTitle}
                    onChange={(e) => {
                      setProbTitle(e.target.value);
                      if (!probSlug || probSlug === probTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                        setProbSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                      }
                    }}
                    placeholder="e.g. Subarray Sum Equals K"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Problem Slug (URL)
                  </label>
                  <input
                    type="text"
                    value={probSlug}
                    onChange={(e) => setProbSlug(e.target.value)}
                    placeholder="e.g. subarray-sum-equals-k"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={probDifficulty}
                    onChange={(e) => setProbDifficulty(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-red-500"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Time Limit (Milliseconds)
                  </label>
                  <input
                    type="number"
                    value={probTimeLimit}
                    onChange={(e) => setProbTimeLimit(parseInt(e.target.value, 10) || 2000)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Memory Limit (Kilobytes)
                  </label>
                  <input
                    type="number"
                    value={probMemLimit}
                    onChange={(e) => setProbMemLimit(parseInt(e.target.value, 10) || 262144)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Problem Statement */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Problem Statement (Markdown / Instructions)
                </label>
                <textarea
                  value={probDescription}
                  onChange={(e) => setProbDescription(e.target.value)}
                  placeholder="Describe the problem, input format, output format, and constraints..."
                  rows={4}
                  className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Reference Solution Code */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Author Reference Solution Code
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Language:</span>
                    <select
                      value={probLangId}
                      onChange={(e) => setProbLangId(parseInt(e.target.value, 10))}
                      className="bg-zinc-900 border border-zinc-700 text-white rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none"
                    >
                      <option value={71}>Python 3 (id: 71)</option>
                      <option value={63}>JavaScript / Node.js (id: 63)</option>
                      <option value={54}>C++ GCC (id: 54)</option>
                    </select>
                  </div>
                </div>

                <textarea
                  value={probSolutionCode}
                  onChange={(e) => setProbSolutionCode(e.target.value)}
                  placeholder="# Write the canonical reference solution here..."
                  rows={6}
                  className="w-full bg-[#050505] border border-zinc-700 text-emerald-400 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              {/* Test Cases Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                      Test Case Inputs ({probTestCases.length})
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Provide inputs only. Judge0 will automatically execute the solution code to establish the expected output.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddTestCaseDraft}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {probTestCases.map((tc, idx) => (
                    <div key={idx} className="p-4 bg-[#0A0A0A] border border-zinc-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-zinc-400">
                          Case #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => handleUpdateTestCaseDraft(idx, 'isHidden', e.target.checked)}
                              className="rounded border-zinc-700 bg-zinc-900 text-red-600 focus:ring-0"
                            />
                            <span className="text-[11px] font-mono">Hidden (Evaluation Only)</span>
                          </label>

                          {probTestCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCaseDraft(idx)}
                              className="text-zinc-500 hover:text-red-400"
                              title="Remove case"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                            Standard Input (stdin)
                          </label>
                          <textarea
                            value={tc.input}
                            onChange={(e) => handleUpdateTestCaseDraft(idx, 'input', e.target.value)}
                            placeholder="Input passed to solution..."
                            rows={2}
                            className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-red-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                            Expected Output (auto-generated via Judge0)
                          </label>
                          <div className="w-full bg-black/60 border border-zinc-800 rounded-lg p-2 text-xs font-mono min-h-[52px] text-zinc-300">
                            {tc.expectedOutput !== undefined ? (
                              <span className="text-emerald-400 whitespace-pre-wrap">{tc.expectedOutput || '(empty output)'}</span>
                            ) : (
                              <span className="text-zinc-600 italic">Will be computed on preview/save...</span>
                            )}
                            {tc.error && (
                              <span className="text-red-400 block text-[10px] mt-1">{tc.error}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={handlePreviewOutputs}
                  disabled={previewingOutputs}
                  className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors"
                >
                  <Server className="w-4 h-4 text-emerald-400" />
                  <span>{previewingOutputs ? 'Running Code via Judge0...' : 'Run Solution & Preview All Outputs'}</span>
                </button>

                <button
                  type="submit"
                  disabled={authoringProblem}
                  className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 transition-all"
                >
                  {authoringProblem ? (
                    <span>Evaluating & Publishing...</span>
                  ) : (
                    <>
                      <span>Save & Publish Problem to Stage #{probTargetRound}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
           TAB: VENUE GEOLOCATION PERIMETER SETTINGS
           ========================================================================= */}
        {activeTab === 'security' && (
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <span>Physical Venue Geolocation Perimeter Lock</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Ensure participants are physically present inside the event hall. Devices outside this perimeter will be blocked.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-zinc-400">Status:</span>
                <button
                  type="button"
                  onClick={() => setGeoLockEnabled(!geoLockEnabled)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    geoLockEnabled
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {geoLockEnabled ? '[ACTIVE] Geolocation Enforced' : '[OFF] Testing Mode'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Venue Latitude
                  </label>
                  <input
                    type="text"
                    value={venueLat}
                    onChange={(e) => setVenueLat(e.target.value)}
                    placeholder="e.g. 13.082700"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Venue Longitude
                  </label>
                  <input
                    type="text"
                    value={venueLng}
                    onChange={(e) => setVenueLng(e.target.value)}
                    placeholder="e.g. 80.270700"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Perimeter Radius (Meters)
                  </label>
                  <input
                    type="number"
                    value={allowedRadius}
                    onChange={(e) => setAllowedRadius(parseInt(e.target.value) || 200)}
                    placeholder="300"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleCaptureCurrentGPS}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold rounded-xl flex items-center gap-2 text-zinc-300 transition-colors"
                >
                  <Compass className="w-4 h-4 text-zinc-300" />
                  <span>Capture Current GPS Coordinates</span>
                </button>

                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/30"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Geolocation Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
           TAB: LIVE TELEMETRY & TURN TIMER CONTROLS
           ========================================================================= */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Turn Duration Settings Card */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-500" />
                    <span>Synchronized Turn Timer Configuration</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Defines the authoritative relay shift duration. When this countdown reaches 00:00, the workspace automatically triggers a floor handover.
                  </p>
                </div>

                <div className="px-3 py-1 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs font-mono font-bold">
                  Active Interval: {Math.floor(turnDurationSeconds / 60)}m {turnDurationSeconds % 60}s ({turnDurationSeconds}s)
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Turn Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    min={30}
                    step={15}
                    value={turnDurationSeconds}
                    onChange={(e) => setTurnDurationSeconds(parseInt(e.target.value, 10) || 300)}
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Quick Presets
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTurnDurationSeconds(180)}
                      className="flex-1 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                    >
                      3 Min
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurnDurationSeconds(300)}
                      className="flex-1 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                    >
                      5 Min
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurnDurationSeconds(600)}
                      className="flex-1 px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs font-mono transition-colors"
                    >
                      10 Min
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleSaveTurnTimer}
                    disabled={savingTurnTimer}
                    className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-red-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{savingTurnTimer ? 'Saving Timer...' : 'Save Turn Duration'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Anti-Cheat Telemetry Feed */}
            <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-red-800 flex items-center justify-center text-red-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Live Anti-Cheat Telemetry Sensor Feed</span>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 border border-emerald-700 text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>LIVE WEBSOCKET STREAM</span>
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Monitors Page Visibility tab switches and clipboard dumps across all 50 concurrent teams.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTelemetryLogs([])}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-xs font-mono transition-colors"
                  >
                    Clear Feed
                  </button>
                </div>
              </div>

              {/* Telemetry Stream List */}
              {telemetryLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 font-mono text-xs border border-dashed border-zinc-800 rounded-xl">
                  No suspicious activity logged yet. Sensor stream is listening in real time.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {telemetryLogs.map((log: any, idx: number) => {
                    const isTab = log.eventType === 'TAB_SWITCH';
                    const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Just now';
                    return (
                      <div
                        key={log.id || idx}
                        className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono transition-all ${
                          isTab
                            ? 'bg-red-950/20 border-red-900/50 text-red-200'
                            : 'bg-amber-950/20 border-amber-900/50 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                              isTab
                                ? 'bg-red-950 border-red-700 text-red-300'
                                : 'bg-amber-950 border-amber-700 text-amber-300'
                            }`}
                          >
                            {isTab ? '[TAB SWITCH]' : '[LARGE PASTE]'}
                          </span>

                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{log.teamName || log.team?.name || 'Team'}</span>
                              <span className="text-zinc-500 text-[11px]">
                                ({log.teamCode || log.team?.teamCode || 'CODE'})
                              </span>
                              <span>•</span>
                              <span className="text-zinc-300">{log.username || log.user?.username || 'User'}</span>
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  (log.seatSide || log.user?.seatSide) === 'RIGHT'
                                    ? 'bg-purple-950/70 border-purple-800 text-purple-300'
                                    : 'bg-blue-950/70 border-blue-800 text-blue-300'
                                }`}
                              >
                                {(log.seatSide || log.user?.seatSide) === 'RIGHT' ? 'RIGHT WING' : 'LEFT WING'}
                              </span>
                            </div>

                            {log.metadata && (
                              <div className="text-[11px] text-zinc-400 mt-1">
                                {log.metadata.length && (
                                  <span>Pasted length: {log.metadata.length} characters • </span>
                                )}
                                {log.metadata.snippet && (
                                  <span className="text-zinc-500 font-mono">
                                    Snippet: &quot;{log.metadata.snippet}&quot;
                                  </span>
                                )}
                                {log.metadata.problemId && (
                                  <span className="text-zinc-500"> • Problem: {log.metadata.problemId}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className="text-zinc-500 text-[11px] flex-shrink-0">{timeStr}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
           TAB: SINGLE TEAM PROVISIONING
           ========================================================================= */}
        {activeTab === 'single' && (
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Manual Team & Credential Setup</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Provision a 2-person relay team with automatic <strong>Left Wing</strong> and <strong>Right Wing</strong> seating.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAutoFillForm}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <span>Auto-Fill Sample Credentials</span>
              </button>
            </div>

            <form onSubmit={handleCreateSingleTeam} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. AlgoWarriors"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-500"
                    disabled={creatingTeam}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex justify-between">
                    <span>Team Code</span>
                    <button
                      type="button"
                      onClick={() => setTeamCode(generateRandomCode('CODE'))}
                      className="text-[10px] text-red-400 hover:underline"
                    >
                      Generate Code
                    </button>
                  </label>
                  <input
                    type="text"
                    value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value)}
                    placeholder="e.g. WARRIOR88"
                    className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-red-500"
                    disabled={creatingTeam}
                  />
                </div>
              </div>

              {/* Members Credentials Grid with Wing Indicators */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                {/* Member 1 Box (LEFT WING) */}
                <div className="p-4 bg-[#0A0A0A] border border-blue-900/40 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Member 1 • LEFT WING (Initial Writer)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setM1Pass(generateRandomPassword())}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300"
                    >
                      Random Pass
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={m1User}
                      onChange={(e) => setM1User(e.target.value)}
                      placeholder="e.g. alex_code"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                      disabled={creatingTeam}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Password</label>
                    <input
                      type="text"
                      value={m1Pass}
                      onChange={(e) => setM1Pass(e.target.value)}
                      placeholder="e.g. secret123"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500"
                      disabled={creatingTeam}
                    />
                  </div>
                </div>

                {/* Member 2 Box (RIGHT WING) */}
                <div className="p-4 bg-[#0A0A0A] border border-purple-900/40 rounded-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Member 2 • RIGHT WING (Spectator)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setM2Pass(generateRandomPassword())}
                      className="text-[10px] text-zinc-500 hover:text-zinc-300"
                    >
                      Random Pass
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Username</label>
                    <input
                      type="text"
                      value={m2User}
                      onChange={(e) => setM2User(e.target.value)}
                      placeholder="e.g. sam_hacks"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
                      disabled={creatingTeam}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Password</label>
                    <input
                      type="text"
                      value={m2Pass}
                      onChange={(e) => setM2Pass(e.target.value)}
                      placeholder="e.g. secret456"
                      className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple-500"
                      disabled={creatingTeam}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingTeam}
                className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
              >
                {creatingTeam ? 'Provisioning Team...' : 'Provision Team & Create Accounts (Left/Right Assigned)'}
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
           TAB: BULK CSV IMPORT
           ========================================================================= */}
        {activeTab === 'bulk' && (
          <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Bulk CSV / Form Responses Importer</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Paste CSV rows directly from your Google Sheets form responses. Member 1 is automatically designated as <strong>Left Wing</strong>, Member 2 as <strong>Right Wing</strong>.
              </p>
            </div>

            <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-400 space-y-1">
              <span className="text-zinc-500 block font-bold">REQUIRED LINE FORMAT:</span>
              <code>TeamName, TeamCode, Member1Username, Member1Password, Member2Username, Member2Password</code>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`BinaryBeasts, BEAST01, john_doe, pass123, jane_doe, pass456\nCodeTitans, TITAN99, dev_alex, pass789, dev_sam, pass321`}
              rows={8}
              className="w-full bg-[#0A0A0A] border border-zinc-700 text-white rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-red-500"
              disabled={bulkLoading}
            />

            <button
              onClick={handleBulkProvision}
              disabled={bulkLoading}
              className="w-full py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2"
            >
              {bulkLoading ? 'Processing Batch Provisioning...' : 'Provision All Teams in Batch'}
            </button>
          </div>
        )}

        {/* =========================================================================
           ALWAYS VISIBLE ROSTER TABLE WITH SEAT MARKERS & PER-TEAM SWITCH
           ========================================================================= */}
        <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Provisioned Teams & Physical Seating ({teams.length})</h2>
              <p className="text-xs text-zinc-400">Separated by Left Wing and Right Wing for isolated desk arrangements</p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-xs animate-pulse">
              Loading teams roster...
            </div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-xl">
              No teams provisioned yet. Use the form above to add teams from your Google Form responses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2">Team Name</th>
                    <th className="pb-3">Team Code</th>
                    <th className="pb-3">Member 1 (LEFT WING)</th>
                    <th className="pb-3">Member 2 (RIGHT WING)</th>
                    <th className="pb-3">Submissions</th>
                    <th className="pb-3 pr-2 text-right">Relay Floor Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {teams.map((t) => {
                    const m1 = t.members[0]?.username || '—';
                    const m2 = t.members[1]?.username || '—';
                    const m1IsWriter = t.currentEditorId === t.members[0]?.id;
                    const m2IsWriter = t.currentEditorId === t.members[1]?.id;

                    return (
                      <tr key={t.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 pl-2 font-bold text-white">{t.name}</td>
                        <td className="py-3.5">
                          <span className="bg-zinc-900 text-red-400 px-2 py-1 rounded border border-zinc-800 font-bold">
                            {t.teamCode}
                          </span>
                        </td>
                        <td className="py-3.5 text-zinc-300">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/80 text-[11px]">
                            <span>{m1}</span>
                            {m1IsWriter && (
                              <span className="text-[9px] bg-blue-500 text-white px-1 rounded font-bold">WRITER</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 text-zinc-300">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/80 text-[11px]">
                            <span>{m2}</span>
                            {m2IsWriter && (
                              <span className="text-[9px] bg-purple-500 text-white px-1 rounded font-bold">WRITER</span>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 text-zinc-400">{t.submissionCount}</td>
                        <td className="py-3.5 pr-2 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleSwitchTeamTurn(t.id, t.name)}
                            className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-yellow-300 border border-zinc-700 rounded-lg flex items-center gap-1 transition-colors"
                            title="Switch floor between teammates"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Switch Turn</span>
                          </button>

                          <button
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                            title="Delete Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
