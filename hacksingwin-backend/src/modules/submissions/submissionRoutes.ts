import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { SubmissionService } from '../../services/submissionService';

const router = Router();

// POST /api/submissions/run - Dry-run code against sample test cases
router.post('/run', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { problemId, code, languageId } = req.body;
    const userId = req.user?.userId;
    const teamId = req.user?.teamId;

    console.log('[RunCode Request]', {
      problemId,
      languageId,
      codePreview: code ? code.slice(0, 80) : '',
      userId,
      teamId,
    });

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Participant authentication required' });
      return;
    }

    if (!problemId || !code || !languageId) {
      res.status(400).json({ error: 'problemId, code, and languageId are required' });
      return;
    }

    const results = await SubmissionService.runSampleCases({
      userId,
      teamId,
      problemId,
      code,
      languageId: parseInt(languageId, 10),
    });

    console.log('[RunCode Results]', {
      success: results.success,
      allPassed: results.allPassed,
      results: results.results,
    });

    res.status(200).json(results);
  } catch (err: any) {
    console.error('[RunCode Error]', err.message);
    const status = err.message?.includes('authorized') ? 403 : 400;
    res.status(status).json({ error: err.message || 'Failed to run code' });
  }
});

// POST /api/submissions - Submit solution for full official evaluation
router.post('/', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { problemId, code, languageId } = req.body;
    const userId = req.user?.userId;
    const teamId = req.user?.teamId;

    console.log('[SubmitSolution Request]', {
      problemId,
      languageId,
      codePreview: code ? code.slice(0, 80) : '',
      userId,
      teamId,
    });

    if (!userId || !teamId) {
      res.status(401).json({ error: 'Participant authentication required' });
      return;
    }

    if (!problemId || !code || !languageId) {
      res.status(400).json({ error: 'problemId, code, and languageId are required' });
      return;
    }

    const submissionResult = await SubmissionService.submitSolution({
      userId,
      teamId,
      problemId,
      code,
      languageId: parseInt(languageId, 10),
    });

    console.log('[SubmitSolution Results]', {
      status: submissionResult.status,
      score: submissionResult.score,
      passed: `${submissionResult.testCasesPassed} / ${submissionResult.totalTestCases}`,
    });

    res.status(200).json({ success: true, submission: submissionResult });
  } catch (err: any) {
    console.error('[SubmitSolution Error]', err.message);
    let status = 400;
    if (err.message?.includes('authorized')) status = 403;
    if (err.message?.includes('cooldown')) status = 429;
    res.status(status).json({ error: err.message || 'Failed to submit solution' });
  }
});

// GET /api/submissions/problem/:problemId - Get submission history for team on problem
router.get('/problem/:problemId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { problemId } = req.params;
    const teamId = req.user?.teamId;

    if (!teamId) {
      res.status(401).json({ error: 'Team authentication required' });
      return;
    }

    const history = await SubmissionService.getProblemSubmissions(teamId, problemId);
    res.status(200).json({ submissions: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch submission history' });
  }
});

export default router;
