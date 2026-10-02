import prisma from '../config/prisma';
import { redis } from '../config/redis';
import { RedisService } from './redisService';
import { Judge0Service } from './judge0Service';
import { io } from '../realtime/socketServer';
import { LeaderboardService } from '../modules/leaderboard/leaderboardService';

export interface RunSampleParams {
  userId: string;
  teamId: string;
  problemId: string;
  code: string;
  languageId: number;
}

export interface SubmitSolutionParams {
  userId: string;
  teamId: string;
  problemId: string;
  code: string;
  languageId: number;
}

export interface SampleTestCaseResult {
  index: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stderr?: string;
  compileOutput?: string | null;
  passed: boolean;
  timeMs?: number;
  memoryKb?: number;
  status: string;
}

export function normalizeOutput(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

export const SubmissionService = {
  /**
   * Verifies if the user is the currently authorized active writer for their team
   */
  async verifyWriterFloor(teamId: string, userId: string): Promise<boolean> {
    const currentEditorId = await RedisService.getEditor(teamId);
    if (!currentEditorId) {
      // Fallback to team DB record if Redis key hasn't been initialized yet
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { currentEditorId: true },
      });
      return team?.currentEditorId === userId;
    }
    return currentEditorId === userId;
  },

  /**
   * Enforces 5-second submission rate limit per team to prevent spam
   */
  async checkRateLimit(teamId: string): Promise<{ limited: boolean; remainingTtl: number }> {
    const key = `ratelimit:submit:${teamId}`;
    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      return { limited: true, remainingTtl: ttl };
    }
    // Set 5 second throttle
    await redis.set(key, '1', 'EX', 5);
    return { limited: false, remainingTtl: 0 };
  },

  /**
   * Runs code against sample (non-hidden) testcases only (Dry Run)
   */
  async runSampleCases(params: RunSampleParams) {
    const { userId, teamId, problemId, code, languageId } = params;

    // 1. Verify floor control
    const isWriter = await this.verifyWriterFloor(teamId, userId);
    if (!isWriter) {
      throw new Error('Only the active writer is authorized to run code.');
    }

    // 2. Fetch problem and sample test cases (support both UUID and slug)
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [
          { id: problemId },
          { slug: problemId },
        ],
      },
      include: {
        testCases: true,
      },
    });

    if (!problem) {
      throw new Error('Problem not found.');
    }

    let sampleCases = problem.testCases.filter((tc) => !tc.isHidden);
    if (sampleCases.length === 0 && problem.testCases.length > 0) {
      sampleCases = [problem.testCases[0]];
    }

    if (sampleCases.length === 0) {
      throw new Error('No testcases available for this problem.');
    }

    // 3. Execute code against each sample test case
    const results: SampleTestCaseResult[] = [];

    for (let i = 0; i < sampleCases.length; i++) {
      const tc = sampleCases[i];
      const exec = await Judge0Service.runSingle(
        code,
        languageId,
        tc.input,
        problem.timeLimitMs
      );

      const actualNorm = normalizeOutput(exec.stdout);
      const expectedNorm = normalizeOutput(tc.expectedOutput);
      const passed = actualNorm === expectedNorm && exec.statusId === 3;

      results.push({
        index: i + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: exec.stdout || '',
        stderr: exec.stderr || undefined,
        compileOutput: exec.compileOutput,
        passed,
        timeMs: exec.timeMs,
        memoryKb: exec.memoryKb,
        status: exec.statusDescription,
      });

      // If compilation failed, stop early
      if (exec.compileOutput) {
        break;
      }
    }

    const allPassed = results.every((r) => r.passed);
    return {
      success: true,
      allPassed,
      totalSamples: sampleCases.length,
      passedCount: results.filter((r) => r.passed).length,
      results,
    };
  },

  /**
   * Submits code for official evaluation against ALL test cases (visible + hidden)
   */
  async submitSolution(params: SubmitSolutionParams) {
    const { userId, teamId, problemId, code, languageId } = params;

    // 1. Verify floor control
    const isWriter = await this.verifyWriterFloor(teamId, userId);
    if (!isWriter) {
      throw new Error('Only the active writer is authorized to submit solutions.');
    }

    // 2. Enforce 5-second rate-limit
    const rateLimit = await this.checkRateLimit(teamId);
    if (rateLimit.limited) {
      throw new Error(`Submission cooldown active. Please wait ${rateLimit.remainingTtl}s before submitting again.`);
    }

    // 3. Fetch problem and ALL test cases (support both UUID and slug)
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [
          { id: problemId },
          { slug: problemId },
        ],
      },
      include: {
        testCases: true,
      },
    });

    if (!problem) {
      throw new Error('Problem not found.');
    }

    const totalCases = problem.testCases.length;
    if (totalCases === 0) {
      throw new Error('This problem has no test cases configured.');
    }

    // 4. Create initial Submission record in PostgreSQL using resolved problem.id
    const submission = await prisma.submission.create({
      data: {
        teamId,
        userId,
        problemId: problem.id,
        code,
        languageId,
        status: 'PROCESSING',
        totalTestCases: totalCases,
      },
      include: {
        user: { select: { username: true } },
        team: { select: { name: true, passCode: true } },
      },
    });

    // 5. Broadcast QUEUED / PROCESSING event via Socket.IO to team room
    if (io) {
      io.to(`team:${teamId}`).emit('SUBMISSION_QUEUED', {
        submissionId: submission.id,
        problemId: problem.id,
        problemSlug: problem.slug,
        userId,
        username: submission.user.username,
        timestamp: new Date().toISOString(),
      });
    }

    // 6. Evaluate all test cases sequentially
    let passedCount = 0;
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    let finalStatus = 'ACCEPTED';
    let compilerError: string | null = null;
    let failedCaseNumber: number | null = null;

    for (let i = 0; i < totalCases; i++) {
      const tc = problem.testCases[i];
      const exec = await Judge0Service.runSingle(
        code,
        languageId,
        tc.input,
        problem.timeLimitMs
      );

      if (exec.timeMs && exec.timeMs > maxTimeMs) maxTimeMs = exec.timeMs;
      if (exec.memoryKb && exec.memoryKb > maxMemoryKb) maxMemoryKb = exec.memoryKb;

      // Check Compilation Error
      if (exec.compileOutput || (exec.statusId === 6)) {
        finalStatus = 'COMPILATION_ERROR';
        compilerError = exec.compileOutput || exec.stderr || 'Compilation Failed';
        failedCaseNumber = i + 1;
        break;
      }

      // Check Time Limit Exceeded
      if (exec.statusId === 5 || exec.stderr?.toLowerCase().includes('time limit')) {
        finalStatus = 'TIME_LIMIT_EXCEEDED';
        compilerError = `Time Limit Exceeded (${problem.timeLimitMs}ms)`;
        failedCaseNumber = i + 1;
        break;
      }

      // Check Runtime Error
      if (exec.statusId === 11 || (exec.statusId > 6 && exec.statusId !== 3)) {
        finalStatus = 'RUNTIME_ERROR';
        compilerError = exec.stderr || exec.statusDescription || 'Runtime Error';
        failedCaseNumber = i + 1;
        break;
      }

      // Check Output Correctness
      const actualNorm = normalizeOutput(exec.stdout);
      const expectedNorm = normalizeOutput(tc.expectedOutput);

      if (actualNorm === expectedNorm && exec.statusId === 3) {
        passedCount++;
      } else {
        finalStatus = 'WRONG_ANSWER';
        failedCaseNumber = i + 1;
        compilerError = `Wrong Answer on test case ${i + 1}`;
        break;
      }
    }

    // 7. Calculate score
    const score = totalCases > 0 ? Math.round((passedCount / totalCases) * 100) : 0;

    // 8. Update Submission record in PostgreSQL
    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        status: finalStatus,
        score,
        testCasesPassed: passedCount,
        totalTestCases: totalCases,
        timeMs: maxTimeMs || null,
        memoryKb: maxMemoryKb || null,
        compilerOutput: compilerError,
      },
      include: {
        user: { select: { username: true } },
        team: { select: { name: true, passCode: true } },
        problem: { select: { title: true } },
      },
    });

    // 9. Broadcast SUBMISSION_RESULT over Socket.IO to team room and admin room
    const resultPayload = {
      submissionId: updated.id,
      problemId: problem.id,
      problemSlug: problem.slug,
      problemTitle: updated.problem.title,
      userId,
      username: updated.user.username,
      teamId,
      teamName: updated.team.name,
      teamCode: updated.team.passCode,
      status: updated.status,
      score: updated.score,
      testCasesPassed: updated.testCasesPassed,
      totalTestCases: updated.totalTestCases,
      timeMs: updated.timeMs,
      memoryKb: updated.memoryKb,
      compilerOutput: updated.compilerOutput,
      failedCaseNumber,
      createdAt: updated.createdAt,
    };

    if (io) {
      io.to(`team:${teamId}`).emit('SUBMISSION_RESULT', resultPayload);
      io.to('admin_room').emit('ADMIN_SUBMISSION_ALERT', resultPayload);
      console.log(`[Submission] Evaluated ${updated.id}: ${finalStatus} (${passedCount}/${totalCases}) for team ${updated.team.name}`);
      LeaderboardService.broadcastLeaderboard().catch((err) => {
        console.error('[Submission] Failed to broadcast updated leaderboard:', err);
      });
    }

    return resultPayload;
  },

  /**
   * Fetches submission history for a team on a specific problem (by UUID or slug)
   */
  async getProblemSubmissions(teamId: string, problemIdentifier: string) {
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [
          { id: problemIdentifier },
          { slug: problemIdentifier },
        ],
      },
      select: { id: true },
    });
    const targetProblemId = problem?.id || problemIdentifier;

    return prisma.submission.findMany({
      where: { teamId, problemId: targetProblemId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { username: true } },
      },
    });
  },
};
