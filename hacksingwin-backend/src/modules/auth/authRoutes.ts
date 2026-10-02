import { Router, Request, Response } from 'express';
import { loginUser, getCurrentUser } from './authService';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { verifyParticipantLocation } from '../admin/adminService';

const router = Router();

// POST /api/auth/login - Login with username and password (provisioned by admin)
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    const result = await loginUser(username, password);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed. Please verify your credentials.' });
  }
});

// GET /api/auth/me - Get current user profile and team details
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const user = await getCurrentUser(userId);
    res.status(200).json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user' });
  }
});

// POST /api/auth/verify-location - Check if participant is physically inside venue perimeter
router.post('/verify-location', async (req: Request, res: Response): Promise<void> => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      res.status(400).json({ error: 'Valid latitude and longitude numbers are required' });
      return;
    }
    const result = await verifyParticipantLocation(latitude, longitude);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Location verification failed' });
  }
});

export default router;
