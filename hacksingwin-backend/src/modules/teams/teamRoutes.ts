import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { createTeam, joinTeam, getTeamDetails } from './teamService';
import { io } from '../../realtime/socketServer';

const router = Router();

// POST /api/teams/create
router.post('/create', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamName, teamCode } = req.body;
    const userId = req.user!.userId;

    if (!teamName || !teamCode) {
      res.status(400).json({ error: 'teamName and teamCode are required' });
      return;
    }

    const team = await createTeam(userId, teamName, teamCode);
    res.status(201).json({ team });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create team' });
  }
});

// POST /api/teams/join
router.post('/join', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { teamCode } = req.body;
    const userId = req.user!.userId;

    if (!teamCode) {
      res.status(400).json({ error: 'teamCode is required' });
      return;
    }

    const team = await joinTeam(userId, teamCode);

    // Broadcast update in real-time to teammate waiting on /team page!
    if (io) {
      io.to(`team:${team.id}`).emit('TEAM_ROSTER_UPDATED', { team });
      console.log(`📢 Emitted TEAM_ROSTER_UPDATED to team:${team.id}`);
    }

    res.status(200).json({ team });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to join team' });
  }
});

// GET /api/teams/my-team
router.get('/my-team', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const team = await getTeamDetails(userId);
    res.status(200).json({ team });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get team details' });
  }
});

export default router;
