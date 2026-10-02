import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import { AuthPayload } from '../../types';

function createToken(payload: AuthPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: '24h',
  });
}

export async function registerUser(username: string, password: string) {
  const trimmedUser = username.trim();
  if (!trimmedUser || !password) {
    throw new Error('Username and password are required');
  }

  if (trimmedUser.length < 3) {
    throw new Error('Username must be at least 3 characters long');
  }

  if (password.length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }

  const existing = await prisma.user.findUnique({
    where: { username: trimmedUser },
  });

  if (existing) {
    throw new Error('Username already exists. Please choose a different username or log in.');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      username: trimmedUser,
      passwordHash,
      role: 'PARTICIPANT',
    },
  });

  const payload: AuthPayload = {
    userId: user.id,
    teamId: null,
    role: user.role,
  };

  const token = createToken(payload);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      teamId: null,
    },
    team: null,
  };
}

export async function loginUser(username: string, password: string) {
  const trimmedUser = username.trim();
  if (!trimmedUser || !password) {
    throw new Error('Username and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { username: trimmedUser },
    include: {
      team: {
        include: {
          members: {
            select: { id: true, username: true, role: true, seatSide: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('Invalid username or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid username or password');
  }

  const payload: AuthPayload = {
    userId: user.id,
    teamId: user.teamId,
    role: user.role,
  };

  const token = createToken(payload);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      seatSide: user.seatSide,
      teamId: user.teamId,
    },
    team: user.team
      ? {
          id: user.team.id,
          name: user.team.name,
          teamCode: user.team.passCode,
          currentEditorId: user.team.currentEditorId,
          members: user.team.members,
        }
      : null,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      role: true,
      seatSide: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
          passCode: true,
          currentEditorId: true,
          lockGeneration: true,
          members: {
            select: { id: true, username: true, seatSide: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    seatSide: user.seatSide,
    teamId: user.teamId,
    team: user.team
      ? {
          id: user.team.id,
          name: user.team.name,
          teamCode: user.team.passCode,
          currentEditorId: user.team.currentEditorId,
          lockGeneration: user.team.lockGeneration,
          members: user.team.members,
        }
      : null,
  };
}
