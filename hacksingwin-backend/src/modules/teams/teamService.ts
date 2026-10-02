import prisma from '../../config/prisma';
import { RedisService } from '../../services/redisService';

export async function createTeam(userId: string, teamName: string, teamCode: string) {
  const trimmedName = teamName.trim();
  const trimmedCode = teamCode.trim().toUpperCase();

  if (!trimmedName || !trimmedCode) {
    throw new Error('Team name and team code are required');
  }

  if (trimmedCode.length < 3) {
    throw new Error('Team code must be at least 3 characters long');
  }

  // Check if user already has a team
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.teamId) throw new Error('You are already part of a team');

  // Check if team name or team code is taken
  const existingName = await prisma.team.findUnique({ where: { name: trimmedName } });
  if (existingName) throw new Error(`Team name "${trimmedName}" is already taken`);

  const existingCode = await prisma.team.findUnique({ where: { passCode: trimmedCode } });
  if (existingCode) throw new Error(`Team code "${trimmedCode}" is already in use`);

  // Create team with this user as first member and current writer
  const team = await prisma.team.create({
    data: {
      name: trimmedName,
      passCode: trimmedCode,
      currentEditorId: userId,
      lockGeneration: 1,
      members: {
        connect: { id: userId },
      },
    },
    include: {
      members: {
        select: { id: true, username: true },
      },
    },
  });

  // Initialize Redis state for real-time workspace
  await RedisService.initWorkspace(team.id, userId);

  return {
    id: team.id,
    name: team.name,
    teamCode: team.passCode,
    currentEditorId: team.currentEditorId,
    lockGeneration: team.lockGeneration,
    members: team.members,
  };
}

export async function joinTeam(userId: string, teamCode: string) {
  const trimmedCode = teamCode.trim().toUpperCase();
  if (!trimmedCode) throw new Error('Team code is required');

  // Check if user already has a team
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.teamId) throw new Error('You are already part of a team');

  // Find team by code
  const team = await prisma.team.findUnique({
    where: { passCode: trimmedCode },
    include: {
      members: {
        select: { id: true, username: true },
      },
    },
  });

  if (!team) throw new Error(`No team found with code "${trimmedCode}"`);

  // Enforce 2-person team limit!
  if (team.members.length >= 2) {
    throw new Error(`Team "${team.name}" is already full (maximum 2 participants per team)`);
  }

  // Connect user to team
  await prisma.user.update({
    where: { id: userId },
    data: { teamId: team.id },
  });

  // Fetch updated team
  const updatedTeam = await prisma.team.findUnique({
    where: { id: team.id },
    include: {
      members: {
        select: { id: true, username: true },
      },
    },
  });

  return {
    id: updatedTeam!.id,
    name: updatedTeam!.name,
    teamCode: updatedTeam!.passCode,
    currentEditorId: updatedTeam!.currentEditorId,
    lockGeneration: updatedTeam!.lockGeneration,
    members: updatedTeam!.members,
  };
}

export async function getTeamDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          members: {
            select: { id: true, username: true },
          },
        },
      },
    },
  });

  if (!user || !user.team) return null;

  return {
    id: user.team.id,
    name: user.team.name,
    teamCode: user.team.passCode,
    currentEditorId: user.team.currentEditorId,
    lockGeneration: user.team.lockGeneration,
    members: user.team.members,
  };
}
