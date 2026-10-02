import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './modules/auth/authRoutes';
import problemRoutes from './modules/problems/problemRoutes';
import teamRoutes from './modules/teams/teamRoutes';
import adminRoutes from './modules/admin/adminRoutes';
import roundRoutes from './modules/rounds/roundRoutes';
import submissionRoutes from './modules/submissions/submissionRoutes';
import leaderboardRoutes from './modules/leaderboard/leaderboardRoutes';
import { initSocketServer } from './realtime/socketServer';

const app = express();
const httpServer = createServer(app);

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json());

// Health Check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rounds', roundRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Initialize WebSockets
initSocketServer(httpServer);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 HackSingWin Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`========================================`);
});

export { app, httpServer };
