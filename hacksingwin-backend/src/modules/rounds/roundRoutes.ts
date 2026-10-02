import { Router, Request, Response } from 'express';
import {
  getRoundsWithProblems,
  createRound,
  updateRound,
  bulkUpdateRoundsStatus,
  deleteRound,
} from './roundService';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// GET /api/rounds - List all rounds with problems
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const rounds = await getRoundsWithProblems();
    res.status(200).json({ rounds });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch rounds' });
  }
});

// POST /api/rounds/create - Admin dynamically create a new round
router.post('/create', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, durationMin, status } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ error: 'Round title is required' });
      return;
    }

    const round = await createRound({
      title,
      description,
      durationMin: durationMin ? parseInt(durationMin, 10) : 45,
      status: status || 'LOCKED',
    });

    res.status(201).json({ round });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to create round' });
  }
});

// POST /api/rounds/update - Admin update round (status, title, description, duration)
router.post('/update', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roundId, status, title, description, durationMin } = req.body;
    if (!roundId) {
      res.status(400).json({ error: 'roundId is required' });
      return;
    }

    const round = await updateRound(parseInt(roundId, 10), {
      status,
      title,
      description,
      durationMin: durationMin ? parseInt(durationMin, 10) : undefined,
    });

    res.status(200).json({ round });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update round' });
  }
});

// POST /api/rounds/bulk-status - Admin bulk lock or unlock all rounds
router.post('/bulk-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { action } = req.body;
    if (action !== 'LOCK_ALL' && action !== 'UNLOCK_ALL') {
      res.status(400).json({ error: 'action must be LOCK_ALL or UNLOCK_ALL' });
      return;
    }

    const result = await bulkUpdateRoundsStatus(action);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to bulk update rounds' });
  }
});

// DELETE /api/rounds/:id - Admin delete a round
router.delete('/:id', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await deleteRound(parseInt(id, 10));
    res.status(200).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to delete round' });
  }
});

export default router;
