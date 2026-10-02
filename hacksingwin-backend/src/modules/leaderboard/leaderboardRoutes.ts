import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';
import { LeaderboardService } from './leaderboardService';

const router = Router();

// GET /api/leaderboard - Participant / public contest leaderboard
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundId = req.query.roundId ? parseInt(req.query.roundId as string, 10) : undefined;
    const leaderboard = await LeaderboardService.calculateLeaderboard(roundId);

    // Admins always see live standings
    if (req.user?.role === 'ADMIN') {
      res.status(200).json({ ...leaderboard, isAdministratorView: true });
      return;
    }

    // Participants only see if revealed or round is completed
    if (!leaderboard.isRevealedToParticipants) {
      res.status(200).json({
        hidden: true,
        message: 'The leaderboard is concealed during active contest shifts. Final standings will be revealed when the round concludes.',
        roundId: leaderboard.roundId,
        roundTitle: leaderboard.roundTitle,
        roundStatus: leaderboard.roundStatus,
        updatedAt: leaderboard.updatedAt,
      });
      return;
    }

    res.status(200).json(leaderboard);
  } catch (err: any) {
    console.error('[Leaderboard API Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch leaderboard' });
  }
});

// GET /api/leaderboard/live - Admin Stage Presentation live feed
router.get('/live', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const roundId = req.query.roundId ? parseInt(req.query.roundId as string, 10) : undefined;
    const leaderboard = await LeaderboardService.calculateLeaderboard(roundId);
    res.status(200).json(leaderboard);
  } catch (err: any) {
    console.error('[Leaderboard Live API Error]', err);
    res.status(500).json({ error: err.message || 'Failed to fetch live leaderboard' });
  }
});

// POST /api/leaderboard/toggle-reveal - Admin toggle to reveal/hide leaderboard for participants
router.post('/toggle-reveal', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { revealed } = req.body;
    if (typeof revealed !== 'boolean') {
      res.status(400).json({ error: 'revealed boolean is required' });
      return;
    }

    const currentRevealed = await LeaderboardService.setRevealed(revealed);
    res.status(200).json({
      success: true,
      isRevealed: currentRevealed,
      message: currentRevealed
        ? 'Leaderboard is now visible to all participants.'
        : 'Leaderboard is now hidden from participants.',
    });
  } catch (err: any) {
    console.error('[Leaderboard Toggle Reveal Error]', err);
    res.status(500).json({ error: err.message || 'Failed to toggle leaderboard reveal' });
  }
});

export default router;
