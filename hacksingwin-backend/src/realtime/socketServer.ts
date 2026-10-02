import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';
import prisma from '../config/prisma';
import { RedisService } from '../services/redisService';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  teamId?: string | null;
  role?: 'PARTICIPANT' | 'ADMIN';
}

export let io: Server;

/**
 * Atomically executes a relay turn handover for a given team
 */
export async function executeTurnSwitch(teamId: string, customDurationSeconds?: number) {
  const teamRoom = `team:${teamId}`;

  // 1. Lock workspace in Redis & notify clients to lock Monaco editor
  await RedisService.setState(teamId, 'LOCKED');
  if (io) {
    io.to(teamRoom).emit('SWITCH_LOCKED', { message: 'Turn switch initiated. Editor locked.' });
  }

  // 2. Fetch current code buffer & editor from Redis
  const currentCode = await RedisService.getCode(teamId);
  const currentEditorId = await RedisService.getEditor(teamId);

  // 3. Fetch team and members from database
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: { members: true },
  });

  if (!team || team.members.length === 0) {
    await RedisService.setState(teamId, 'ACTIVE');
    return null;
  }

  // Determine the next teammate (the other member in the 2-person relay)
  const nextEditor = team.members.find((m) => m.id !== currentEditorId) || team.members[0];

  // 4. Persist code snapshot to PostgreSQL
  try {
    let targetProblem = await prisma.problem.findFirst({
      where: { round: { status: 'ACTIVE' } },
      select: { id: true },
    });

    if (!targetProblem) {
      targetProblem = await prisma.problem.findFirst({
        select: { id: true },
      });
    }

    if (targetProblem?.id) {
      await prisma.codeSnapshot.create({
        data: {
          teamId,
          problemId: targetProblem.id,
          code: currentCode,
          genId: team.lockGeneration,
        },
      });
    }
  } catch (err) {
    console.error(`[executeTurnSwitch] Failed to save code snapshot for team ${teamId}:`, err);
  }

  // 5. Get configured turn duration from AdminSetting
  let turnDurationSeconds = customDurationSeconds || 300;
  if (!customDurationSeconds) {
    try {
      const setting = await prisma.adminSetting.findUnique({ where: { key: 'turn_duration_seconds' } });
      if (setting?.value) turnDurationSeconds = parseInt(setting.value, 10);
    } catch {
      turnDurationSeconds = 300;
    }
  }

  // 6. Increment lock generation, swap active editor, update turn deadline, and unlock
  const newGen = await RedisService.incrementGen(teamId);
  await RedisService.swapEditor(teamId, nextEditor.id);
  const turnDeadline = await RedisService.setTurnDeadline(teamId, turnDurationSeconds);
  await RedisService.setState(teamId, 'ACTIVE');

  // Update Team record in DB
  await prisma.team.update({
    where: { id: teamId },
    data: {
      currentEditorId: nextEditor.id,
      lockGeneration: newGen,
    },
  });

  // 7. Broadcast SWITCH_COMPLETE to the team
  if (io) {
    io.to(teamRoom).emit('SWITCH_COMPLETE', {
      newEditorId: nextEditor.id,
      newEditorUsername: nextEditor.username,
      genId: newGen,
      code: currentCode,
      turnDeadline,
    });

    // Notify organizers on the admin console
    io.to('admin_room').emit('TEAM_SWITCHED', {
      teamId,
      teamName: team.name,
      newEditorId: nextEditor.id,
      newEditorUsername: nextEditor.username,
      genId: newGen,
      turnDeadline,
    });
  }

  console.log(`[TurnSwitch] Team "${team.name}" handed over to ${nextEditor.username} (Gen: ${newGen}, Deadline: ${turnDeadline})`);
  return { team, nextEditor, newGen, currentCode, turnDeadline };
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow frontend during local dev
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // JWT Authentication Middleware for WebSockets
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthPayload;
      socket.userId = payload.userId;
      socket.teamId = payload.teamId;
      socket.role = payload.role;
      next();
    } catch (err) {
      next(new Error('Invalid authentication token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`[Socket] Connected: user=${socket.userId}, team=${socket.teamId}, role=${socket.role}`);

    // If teamId not in token, look up from DB
    if (!socket.teamId && socket.userId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { teamId: true },
      });
      if (dbUser?.teamId) {
        socket.teamId = dbUser.teamId;
      }
    }

    if (socket.role === 'ADMIN') {
      socket.join('admin_room');
      console.log(`[Socket] Admin socket ${socket.id} joined admin_room`);
    } else if (socket.teamId) {
      const teamRoom = `team:${socket.teamId}`;
      socket.join(teamRoom);
      console.log(`[Socket] Participant socket ${socket.id} joined ${teamRoom}`);

      // Ensure team workspace is initialized in Redis
      const existingEditor = await RedisService.getEditor(socket.teamId);
      if (!existingEditor) {
        const team = await prisma.team.findUnique({ where: { id: socket.teamId } });
        if (team?.currentEditorId) {
          await RedisService.initWorkspace(socket.teamId, team.currentEditorId);
        }
      }

      // Send initial workspace state to connecting/reconnecting client
      let turnDeadline = await RedisService.getTurnDeadline(socket.teamId);
      if (!turnDeadline) {
        turnDeadline = await RedisService.setTurnDeadline(socket.teamId, 300);
      }

      const [code, currentEditorId, genId] = await Promise.all([
        RedisService.getCode(socket.teamId),
        RedisService.getEditor(socket.teamId),
        RedisService.getGen(socket.teamId),
      ]);

      // Blind Relay Mode: Only send code to the active writer.
      // The spectator's code is concealed until official relay handover.
      const isWriter = socket.userId === currentEditorId;
      socket.emit('SYNC_STATE', {
        code: isWriter ? code : '',
        activeEditorId: currentEditorId,
        genId,
        turnDeadline,
      });
    }

    // Single-writer keystroke synchronization (Blind Relay Mode)
    socket.on('CODE_UPDATE', async (data: { code: string; genId: number }) => {
      if (!socket.teamId || !socket.userId) return;

      const [activeEditorId, currentGen, state] = await Promise.all([
        RedisService.getEditor(socket.teamId),
        RedisService.getGen(socket.teamId),
        RedisService.getState(socket.teamId),
      ]);

      // Floor control verifications
      if (state !== 'ACTIVE') return; // Locked during handover
      if (socket.userId !== activeEditorId) return; // Only active writer can mutate
      if (data.genId !== currentGen) return; // Ignore stale generation updates

      // Update in-memory authoritative Redis buffer
      await RedisService.setCode(socket.teamId, data.code);

      // In Blind Relay Mode, keystrokes are NOT streamed to the spectator during the turn.
      // Code is revealed only when the turn switch handover is executed.
    });

    // Anti-cheat telemetry logging listener
    socket.on('TELEMETRY_LOG', async (data: { eventType: 'TAB_SWITCH' | 'LARGE_PASTE' | 'RECONNECT'; metadata?: any }) => {
      if (!socket.teamId || !socket.userId) return;

      try {
        const log = await prisma.telemetryLog.create({
          data: {
            teamId: socket.teamId,
            userId: socket.userId,
            eventType: data.eventType || 'TAB_SWITCH',
            metadata: data.metadata || {},
          },
          include: {
            team: { select: { name: true, passCode: true } },
            user: { select: { username: true, seatSide: true } },
          },
        });

        // Broadcast to organizers in admin_room immediately
        io.to('admin_room').emit('TELEMETRY_ALERT', {
          id: log.id,
          teamId: log.teamId,
          teamName: log.team.name,
          teamCode: log.team.passCode,
          userId: log.userId,
          username: log.user.username,
          seatSide: log.user.seatSide,
          eventType: log.eventType,
          metadata: log.metadata,
          timestamp: log.timestamp,
        });

        console.log(`[Telemetry] ${log.eventType} from ${log.user.username} (${log.team.name})`);
      } catch (err) {
        console.error('[Telemetry] Failed to log event:', err);
      }
    });

    // Explicit room join handler for when user creates or joins a team mid-session
    socket.on('JOIN_TEAM_ROOM', async (teamId: string) => {
      if (!teamId) return;
      socket.teamId = teamId;
      const teamRoom = `team:${teamId}`;
      socket.join(teamRoom);
      console.log(`[Socket] Socket ${socket.id} (user ${socket.userId}) joined ${teamRoom}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Disconnected: ${socket.userId} (${reason})`);
    });
  });

  return io;
}
