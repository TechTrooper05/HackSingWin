import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';
import prisma from '../../config/prisma';
import { executeTurnSwitch } from '../../realtime/socketServer';
import { Judge0Service } from '../../services/judge0Service';
import {
  createTeamWithMembers,
  batchCreateTeams,
  listAllTeams,
  deleteTeam,
  getContestSettings,
  updateContestSettings,
} from './adminService';

const router = Router();

// Protect all admin routes
router.use(authenticate);
router.use(requireAdmin);

// POST /api/admin/teams/create - Provision a single team with Member 1 & Member 2 credentials
router.post('/teams/create', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamName, teamCode, member1, member2 } = req.body;
    const team = await createTeamWithMembers({
      teamName,
      teamCode,
      member1,
      member2,
    });
    res.status(201).json({ team });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to provision team' });
  }
});

// POST /api/admin/teams/batch - Batch provision teams from form/CSV export
router.post('/teams/batch', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ error: 'teams must be a non-empty array of team definitions' });
      return;
    }
    const results = await batchCreateTeams(teams);
    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Batch provisioning failed' });
  }
});

// GET /api/admin/teams - List all provisioned teams and their roster
router.get('/teams', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const teams = await listAllTeams();
    res.status(200).json({ teams });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to list teams' });
  }
});

// DELETE /api/admin/teams/:id - Delete a provisioned team
router.delete('/teams/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteTeam(id);
    res.status(200).json({ success: true, message: 'Team deleted' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete team' });
  }
});

// POST /api/admin/switch-turn - Trigger relay turn handover (single team or all teams)
router.post('/switch-turn', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamId, all, durationSeconds } = req.body;

    if (all) {
      const allTeams = await prisma.team.findMany({ select: { id: true, name: true } });
      const results = [];
      for (const t of allTeams) {
        const switched = await executeTurnSwitch(t.id, durationSeconds);
        if (switched) results.push({ teamId: t.id, name: t.name, newEditor: switched.nextEditor.username });
      }
      res.status(200).json({ success: true, count: results.length, teams: results });
      return;
    }

    if (!teamId) {
      res.status(400).json({ error: 'teamId is required unless all: true is passed' });
      return;
    }

    const switched = await executeTurnSwitch(teamId, durationSeconds);
    if (!switched) {
      res.status(404).json({ error: 'Team not found or has no members' });
      return;
    }

    res.status(200).json({
      success: true,
      teamId,
      teamName: switched.team.name,
      newEditorId: switched.nextEditor.id,
      newEditorUsername: switched.nextEditor.username,
      genId: switched.newGen,
      turnDeadline: switched.turnDeadline,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to execute turn switch' });
  }
});

// GET /api/admin/judge0-status - Health check for AWS-hosted or local Judge0 CE instance
router.get('/judge0-status', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await Judge0Service.checkHealth();
    res.status(200).json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check Judge0 status' });
  }
});

// GET /api/admin/telemetry - List recent 50 telemetry logs
router.get('/telemetry', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const logs = await prisma.telemetryLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        team: { select: { name: true, passCode: true } },
        user: { select: { username: true, seatSide: true } },
      },
    });
    res.status(200).json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch telemetry logs' });
  }
});

// GET /api/admin/turn-timer - Get configured turn duration
router.get('/turn-timer', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key: 'turn_duration_seconds' } });
    const durationSeconds = setting ? parseInt(setting.value, 10) : 300;
    res.status(200).json({ durationSeconds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch turn timer setting' });
  }
});

// POST /api/admin/turn-timer - Update turn duration
router.post('/turn-timer', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { durationSeconds } = req.body;
    if (!durationSeconds || durationSeconds < 30) {
      res.status(400).json({ error: 'durationSeconds must be at least 30 seconds' });
      return;
    }

    await prisma.adminSetting.upsert({
      where: { key: 'turn_duration_seconds' },
      update: { value: durationSeconds.toString() },
      create: { key: 'turn_duration_seconds', value: durationSeconds.toString() },
    });

    res.status(200).json({ success: true, durationSeconds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update turn timer setting' });
  }
});

// GET /api/admin/settings - Get contest settings (geo-lock, venue coordinates, radius)
router.get('/settings', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const settings = await getContestSettings();
    res.status(200).json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

// POST /api/admin/settings - Update contest settings
router.post('/settings', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { geoLockEnabled, venueLat, venueLng, allowedRadiusMeters } = req.body;
    const settings = await updateContestSettings({
      geoLockEnabled,
      venueLat,
      venueLng,
      allowedRadiusMeters,
    });
    res.status(200).json({ settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

export default router;
