import prisma from '../../config/prisma';
import { redis } from '../../config/redis';
import { io } from '../../realtime/socketServer';

export interface ProblemScoreDetail {
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

export interface TeamLeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  teamCode: string;
  problemsSolved: number;
  totalRawScore: number;
  totalDeductions: number;
  totalNetScore: number;
  lastAcceptedAt: string | null;
  problems: Record<string, ProblemScoreDetail>;
}

export interface LeaderboardResult {
  roundId: number | null;
  roundTitle: string;
  roundStatus: string;
  isRevealedToParticipants: boolean;
  totalTeams: number;
  deductionPerFailedAttempt: number;
  standings: TeamLeaderboardEntry[];
  updatedAt: string;
}

const DEDUCTION_PER_FAILED_ATTEMPT = 5; // -5 points per rejected attempt before AC

export const LeaderboardService = {
  /**
   * Retrieves whether the leaderboard is currently revealed to participants
   */
  async isRevealed(): Promise<boolean> {
    const setting = await prisma.adminSetting.findUnique({
      where: { key: 'reveal_leaderboard' },
    });
    return setting?.value === 'true';
  },

  /**
   * Toggles participant visibility of the leaderboard
   */
  async setRevealed(revealed: boolean): Promise<boolean> {
    await prisma.adminSetting.upsert({
      where: { key: 'reveal_leaderboard' },
      update: { value: revealed ? 'true' : 'false' },
      create: { key: 'reveal_leaderboard', value: revealed ? 'true' : 'false' },
    });

    if (io) {
      io.emit('LEADERBOARD_STATUS_CHANGED', { isRevealed: revealed });
    }

    await this.broadcastLeaderboard();
    return revealed;
  },

  /**
   * Computes the tournament leaderboard for an active or specific round
   */
  async calculateLeaderboard(targetRoundId?: number): Promise<LeaderboardResult> {
    // 1. Resolve Target Round
    let round = null;
    if (targetRoundId) {
      round = await prisma.contestRound.findUnique({
        where: { id: targetRoundId },
        include: { problems: { select: { id: true, title: true, slug: true } } },
      });
    }

    if (!round) {
      round = await prisma.contestRound.findFirst({
        where: { status: 'ACTIVE' },
        include: { problems: { select: { id: true, title: true, slug: true } } },
      });
    }

    if (!round) {
      round = await prisma.contestRound.findFirst({
        orderBy: { id: 'asc' },
        include: { problems: { select: { id: true, title: true, slug: true } } },
      });
    }

    const roundId = round?.id || null;
    const roundTitle = round?.title || 'Main Tournament';
    const roundStatus = round?.status || 'ACTIVE';
    const problems = round?.problems || (await prisma.problem.findMany({ select: { id: true, title: true, slug: true } }));

    // 2. Fetch all teams
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        passCode: true,
      },
      orderBy: { name: 'asc' },
    });

    // 3. Fetch all submissions for the round's problems
    const problemIds = problems.map((p) => p.id);
    const submissions = await prisma.submission.findMany({
      where: {
        problemId: { in: problemIds },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        teamId: true,
        problemId: true,
        status: true,
        score: true,
        createdAt: true,
      },
    });

    // 4. Group submissions by team and problem
    const teamSubmissionsMap = new Map<string, Map<string, typeof submissions>>();
    for (const sub of submissions) {
      if (!teamSubmissionsMap.has(sub.teamId)) {
        teamSubmissionsMap.set(sub.teamId, new Map());
      }
      const probMap = teamSubmissionsMap.get(sub.teamId)!;
      if (!probMap.has(sub.problemId)) {
        probMap.set(sub.problemId, []);
      }
      probMap.get(sub.problemId)!.push(sub);
    }

    // 5. Evaluate each team's score per problem with score deduction
    const entries: TeamLeaderboardEntry[] = [];

    for (const team of teams) {
      const probMap = teamSubmissionsMap.get(team.id) || new Map();
      let totalRawScore = 0;
      let totalDeductions = 0;
      let totalNetScore = 0;
      let problemsSolved = 0;
      let lastAcceptedTimestamp: Date | null = null;
      const problemDetails: Record<string, ProblemScoreDetail> = {};

      for (const prob of problems) {
        const teamSubs = probMap.get(prob.id) || [];
        let solved = false;
        let rawScore = 0;
        let failedAttemptsBeforeAC = 0;
        let solvedAt: string | null = null;

        for (const sub of teamSubs) {
          if (sub.status === 'ACCEPTED') {
            solved = true;
            rawScore = Math.max(rawScore, sub.score || 100);
            solvedAt = sub.createdAt.toISOString();
            const subDate = new Date(sub.createdAt);
            if (!lastAcceptedTimestamp || subDate > lastAcceptedTimestamp) {
              lastAcceptedTimestamp = subDate;
            }
            break; // Stop counting failed attempts after first AC
          } else {
            failedAttemptsBeforeAC += 1;
            rawScore = Math.max(rawScore, sub.score || 0);
          }
        }

        // If solved, apply score deduction for rejected attempts before AC
        // Minimum problem score floor is 0
        const deductionPoints = solved ? failedAttemptsBeforeAC * DEDUCTION_PER_FAILED_ATTEMPT : 0;
        const netScore = solved ? Math.max(0, rawScore - deductionPoints) : 0;

        if (solved) {
          problemsSolved += 1;
          totalRawScore += rawScore;
          totalDeductions += deductionPoints;
          totalNetScore += netScore;
        }

        problemDetails[prob.slug || prob.id] = {
          problemId: prob.id,
          problemTitle: prob.title,
          problemSlug: prob.slug,
          solved,
          rawScore,
          failedAttemptsBeforeAC,
          deductionPoints,
          netScore,
          solvedAt,
        };
      }

      entries.push({
        rank: 1, // calculated after sorting
        teamId: team.id,
        teamName: team.name,
        teamCode: team.passCode,
        problemsSolved,
        totalRawScore,
        totalDeductions,
        totalNetScore,
        lastAcceptedAt: lastAcceptedTimestamp ? lastAcceptedTimestamp.toISOString() : null,
        problems: problemDetails,
      });
    }

    // 6. Sort Standings:
    //    Primary: totalNetScore (descending)
    //    Secondary: problemsSolved (descending)
    //    Tertiary: lastAcceptedAt (ascending - earlier time wins)
    entries.sort((a, b) => {
      if (b.totalNetScore !== a.totalNetScore) {
        return b.totalNetScore - a.totalNetScore;
      }
      if (b.problemsSolved !== a.problemsSolved) {
        return b.problemsSolved - a.problemsSolved;
      }
      if (a.lastAcceptedAt && b.lastAcceptedAt) {
        return new Date(a.lastAcceptedAt).getTime() - new Date(b.lastAcceptedAt).getTime();
      }
      if (a.lastAcceptedAt && !b.lastAcceptedAt) return -1;
      if (!a.lastAcceptedAt && b.lastAcceptedAt) return 1;
      return a.teamName.localeCompare(b.teamName);
    });

    // 7. Assign ranks (handle ties with same rank if identical net score and solve count)
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (
        i > 0 &&
        entries[i].totalNetScore === entries[i - 1].totalNetScore &&
        entries[i].problemsSolved === entries[i - 1].problemsSolved &&
        entries[i].lastAcceptedAt === entries[i - 1].lastAcceptedAt
      ) {
        entries[i].rank = entries[i - 1].rank;
      } else {
        entries[i].rank = currentRank;
      }
      currentRank++;
    }

    const isRevealedToParticipants = (await this.isRevealed()) || roundStatus === 'COMPLETED';

    const result: LeaderboardResult = {
      roundId,
      roundTitle,
      roundStatus,
      isRevealedToParticipants,
      totalTeams: entries.length,
      deductionPerFailedAttempt: DEDUCTION_PER_FAILED_ATTEMPT,
      standings: entries,
      updatedAt: new Date().toISOString(),
    };

    // Cache in Redis with 10s TTL
    try {
      await redis.set('leaderboard:cache', JSON.stringify(result), 'EX', 10);
    } catch {}

    return result;
  },

  /**
   * Broadcasts the updated leaderboard over Socket.IO:
   * Always to admin_room (for the live stage presentation)
   * And to participants if revealed or round is completed
   */
  async broadcastLeaderboard(): Promise<void> {
    try {
      const data = await this.calculateLeaderboard();
      if (!io) return;

      // 1. Stage / Admin Display always gets live real-time updates
      io.to('admin_room').emit('LEADERBOARD_UPDATE', data);

      // 2. If revealed or round completed, also stream to all participants
      if (data.isRevealedToParticipants) {
        io.emit('LEADERBOARD_UPDATE', data);
      }
    } catch (err) {
      console.error('[LeaderboardService.broadcastLeaderboard] Error:', err);
    }
  },
};
