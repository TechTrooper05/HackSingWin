import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { RedisService } from '../../services/redisService';

export interface MemberInput {
  username: string;
  password: string;
}

export interface CreateTeamWithMembersInput {
  teamName: string;
  teamCode: string;
  member1: MemberInput;
  member2: MemberInput;
}

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function createTeamWithMembers(input: CreateTeamWithMembersInput) {
  const teamName = input.teamName.trim();
  const teamCode = input.teamCode.trim().toUpperCase();
  const m1User = input.member1.username.trim();
  const m1Pass = input.member1.password;
  const m2User = input.member2.username.trim();
  const m2Pass = input.member2.password;

  if (!teamName || !teamCode) {
    throw new Error('Team name and team code are required');
  }

  if (!m1User || !m1Pass || !m2User || !m2Pass) {
    throw new Error('Both Member 1 and Member 2 must have a username and password');
  }

  if (m1User === m2User) {
    throw new Error('Member 1 and Member 2 must have different usernames');
  }

  // Check unique constraints
  const [existingTeamName, existingTeamCode, existingUser1, existingUser2] = await Promise.all([
    prisma.team.findUnique({ where: { name: teamName } }),
    prisma.team.findUnique({ where: { passCode: teamCode } }),
    prisma.user.findUnique({ where: { username: m1User } }),
    prisma.user.findUnique({ where: { username: m2User } }),
  ]);

  if (existingTeamName) throw new Error(`Team name "${teamName}" is already in use`);
  if (existingTeamCode) throw new Error(`Team code "${teamCode}" is already in use`);
  if (existingUser1) throw new Error(`Username "${m1User}" already exists`);
  if (existingUser2) throw new Error(`Username "${m2User}" already exists`);

  const salt = await bcrypt.genSalt(10);
  const [m1Hash, m2Hash] = await Promise.all([
    bcrypt.hash(m1Pass, salt),
    bcrypt.hash(m2Pass, salt),
  ]);

  // Create team with both members in a transaction
  const createdTeam = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: {
        name: teamName,
        passCode: teamCode,
        lockGeneration: 1,
      },
    });

    // Member 1 assigned to LEFT wing (Initial Writer)
    const user1 = await tx.user.create({
      data: {
        username: m1User,
        passwordHash: m1Hash,
        role: 'PARTICIPANT',
        seatSide: 'LEFT',
        teamId: team.id,
      },
    });

    // Member 2 assigned to RIGHT wing (Spectator)
    const user2 = await tx.user.create({
      data: {
        username: m2User,
        passwordHash: m2Hash,
        role: 'PARTICIPANT',
        seatSide: 'RIGHT',
        teamId: team.id,
      },
    });

    // Assign Member 1 as the initial active writer
    const updatedTeam = await tx.team.update({
      where: { id: team.id },
      data: { currentEditorId: user1.id },
      include: {
        members: {
          select: { id: true, username: true, role: true, seatSide: true },
        },
      },
    });

    return { updatedTeam, user1, user2 };
  });

  // Initialize in Redis for real-time sync
  await RedisService.initWorkspace(createdTeam.updatedTeam.id, createdTeam.user1.id);

  return {
    id: createdTeam.updatedTeam.id,
    name: createdTeam.updatedTeam.name,
    teamCode: createdTeam.updatedTeam.passCode,
    currentEditorId: createdTeam.updatedTeam.currentEditorId,
    lockGeneration: createdTeam.updatedTeam.lockGeneration,
    members: createdTeam.updatedTeam.members,
  };
}

export async function batchCreateTeams(teamsList: CreateTeamWithMembersInput[]) {
  const results: { success: any[]; errors: any[] } = { success: [], errors: [] };

  for (const teamData of teamsList) {
    try {
      const created = await createTeamWithMembers(teamData);
      results.success.push(created);
    } catch (err: any) {
      results.errors.push({
        teamName: teamData.teamName,
        error: err.message || 'Failed to create team',
      });
    }
  }

  return results;
}

export async function listAllTeams() {
  const teams = await prisma.team.findMany({
    where: {
      name: { not: 'Organizers' }, // Exclude internal admin team
    },
    include: {
      members: {
        select: { id: true, username: true, role: true, seatSide: true, createdAt: true },
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return teams.map((team) => ({
    id: team.id,
    name: team.name,
    teamCode: team.passCode,
    currentEditorId: team.currentEditorId,
    lockGeneration: team.lockGeneration,
    members: team.members,
    submissionCount: team._count.submissions,
    createdAt: team.createdAt,
  }));
}

export async function deleteTeam(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new Error('Team not found');
  if (team.name === 'Organizers') throw new Error('Cannot delete admin organizers team');

  // Cascade delete users and team
  await prisma.user.deleteMany({ where: { teamId } });
  await prisma.submission.deleteMany({ where: { teamId } });
  await prisma.codeSnapshot.deleteMany({ where: { teamId } });
  await prisma.telemetryLog.deleteMany({ where: { teamId } });
  await prisma.team.delete({ where: { id: teamId } });

  return { success: true };
}

// ==========================================
// CONTEST & GEOLOCATION SETTINGS
// ==========================================
export async function getContestSettings() {
  const settings = await prisma.adminSetting.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }

  return {
    geoLockEnabled: map['GEO_LOCK_ENABLED'] === 'true',
    venueLat: map['VENUE_LAT'] ? parseFloat(map['VENUE_LAT']) : null,
    venueLng: map['VENUE_LNG'] ? parseFloat(map['VENUE_LNG']) : null,
    allowedRadiusMeters: map['ALLOWED_RADIUS_METERS'] ? parseInt(map['ALLOWED_RADIUS_METERS'], 10) : 500,
  };
}

export async function updateContestSettings(input: {
  geoLockEnabled?: boolean;
  venueLat?: number;
  venueLng?: number;
  allowedRadiusMeters?: number;
}) {
  if (input.geoLockEnabled !== undefined) {
    await prisma.adminSetting.upsert({
      where: { key: 'GEO_LOCK_ENABLED' },
      update: { value: input.geoLockEnabled ? 'true' : 'false' },
      create: { key: 'GEO_LOCK_ENABLED', value: input.geoLockEnabled ? 'true' : 'false' },
    });
  }
  if (input.venueLat !== undefined) {
    await prisma.adminSetting.upsert({
      where: { key: 'VENUE_LAT' },
      update: { value: input.venueLat.toString() },
      create: { key: 'VENUE_LAT', value: input.venueLat.toString() },
    });
  }
  if (input.venueLng !== undefined) {
    await prisma.adminSetting.upsert({
      where: { key: 'VENUE_LNG' },
      update: { value: input.venueLng.toString() },
      create: { key: 'VENUE_LNG', value: input.venueLng.toString() },
    });
  }
  if (input.allowedRadiusMeters !== undefined) {
    await prisma.adminSetting.upsert({
      where: { key: 'ALLOWED_RADIUS_METERS' },
      update: { value: input.allowedRadiusMeters.toString() },
      create: { key: 'ALLOWED_RADIUS_METERS', value: input.allowedRadiusMeters.toString() },
    });
  }

  return await getContestSettings();
}

export async function verifyParticipantLocation(lat: number, lng: number) {
  const settings = await getContestSettings();
  if (!settings.geoLockEnabled || settings.venueLat === null || settings.venueLng === null) {
    return {
      allowed: true,
      geoLockEnabled: false,
      distanceMeters: 0,
      allowedRadiusMeters: settings.allowedRadiusMeters,
    };
  }

  const distance = calculateDistanceMeters(lat, lng, settings.venueLat, settings.venueLng);
  const allowed = distance <= settings.allowedRadiusMeters;

  return {
    allowed,
    geoLockEnabled: true,
    distanceMeters: distance,
    allowedRadiusMeters: settings.allowedRadiusMeters,
  };
}
