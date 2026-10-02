import prisma from '../../config/prisma';
import { io } from '../../realtime/socketServer';

export async function getRoundsWithProblems() {
  const rounds = await prisma.contestRound.findMany({
    orderBy: { id: 'asc' },
    include: {
      problems: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          timeLimitMs: true,
          memoryLimitKb: true,
        },
      },
    },
  });

  return rounds;
}

export async function createRound(data: {
  title: string;
  description?: string;
  durationMin?: number;
  status?: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
}) {
  const maxRound = await prisma.contestRound.findFirst({
    orderBy: { id: 'desc' },
  });
  const nextId = (maxRound?.id || 0) + 1;

  const round = await prisma.contestRound.create({
    data: {
      id: nextId,
      title: data.title.trim(),
      description: data.description ? data.description.trim() : null,
      durationMin: data.durationMin || 45,
      status: data.status || 'LOCKED',
    },
    include: {
      problems: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
        },
      },
    },
  });

  if (io) {
    io.emit('ROUND_STATUS_CHANGED', { action: 'CREATED', round });
    console.log(`[Rounds] Created Round #${round.id}: "${round.title}" (Status: ${round.status})`);
  }

  return round;
}

export async function updateRound(
  roundId: number,
  data: {
    status?: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
    title?: string;
    description?: string;
    durationMin?: number;
  }
) {
  const existing = await prisma.contestRound.findUnique({ where: { id: roundId } });
  if (!existing) throw new Error(`Round ${roundId} not found`);

  const updatePayload: any = {};
  if (data.status) {
    updatePayload.status = data.status;
    if (data.status === 'ACTIVE' && !existing.startsAt) {
      updatePayload.startsAt = new Date();
    } else if (data.status === 'COMPLETED' && !existing.endsAt) {
      updatePayload.endsAt = new Date();
    }
  }
  if (data.title) updatePayload.title = data.title.trim();
  if (data.description !== undefined) updatePayload.description = data.description ? data.description.trim() : null;
  if (data.durationMin) updatePayload.durationMin = data.durationMin;

  const updated = await prisma.contestRound.update({
    where: { id: roundId },
    data: updatePayload,
    include: {
      problems: {
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
        },
      },
    },
  });

  if (io) {
    io.emit('ROUND_STATUS_CHANGED', { action: 'UPDATED', round: updated });
    console.log(`[Rounds] Updated Round #${roundId}: "${updated.title}" (Status: ${updated.status})`);
  }

  return updated;
}

export async function bulkUpdateRoundsStatus(action: 'LOCK_ALL' | 'UNLOCK_ALL') {
  const targetStatus = action === 'UNLOCK_ALL' ? 'ACTIVE' : 'LOCKED';

  await prisma.contestRound.updateMany({
    data: { status: targetStatus },
  });

  const allRounds = await getRoundsWithProblems();

  if (io) {
    io.emit('ROUND_STATUS_CHANGED', { action: 'BULK_UPDATE', status: targetStatus });
    console.log(`[Rounds] Bulk status change: All rounds set to [${targetStatus}]`);
  }

  return { targetStatus, rounds: allRounds };
}

export async function deleteRound(roundId: number) {
  // Unlink problems first so they don't break foreign key constraints
  await prisma.problem.updateMany({
    where: { roundId },
    data: { roundId: null },
  });

  await prisma.contestRound.delete({
    where: { id: roundId },
  });

  if (io) {
    io.emit('ROUND_STATUS_CHANGED', { action: 'DELETED', roundId });
    console.log(`[Rounds] Deleted Round #${roundId}`);
  }

  return { success: true, deletedRoundId: roundId };
}
