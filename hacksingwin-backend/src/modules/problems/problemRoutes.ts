import { Router, Request, Response } from 'express';
import prisma from '../../config/prisma';
import { Judge0Service } from '../../services/judge0Service';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../../middleware/auth';

const router = Router();

// GET /api/problems - List all contest problems
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const problems = await prisma.problem.findMany({
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        timeLimitMs: true,
        memoryLimitKb: true,
        roundId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.status(200).json({ problems });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch problems' });
  }
});

// POST /api/problems/preview-outputs - Run reference solution against test cases to preview outputs
router.post('/preview-outputs', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { sourceCode, languageId, testCases, timeLimitMs } = req.body;

    if (!sourceCode || !languageId || !Array.isArray(testCases) || testCases.length === 0) {
      res.status(400).json({ error: 'sourceCode, languageId, and non-empty testCases array are required' });
      return;
    }

    const results = await Judge0Service.generateTestcaseOutputs(
      sourceCode,
      parseInt(languageId, 10),
      testCases,
      timeLimitMs ? parseInt(timeLimitMs, 10) : 2000
    );

    res.status(200).json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to preview testcase outputs' });
  }
});

// POST /api/problems/author - Author problem, run through Judge0 to set outputs, and save to DB
router.post('/author', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      title,
      slug: customSlug,
      description,
      difficulty,
      roundId,
      timeLimitMs,
      memoryLimitKb,
      sourceCode,
      languageId,
      testCases,
    } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required' });
      return;
    }

    if (!sourceCode || !languageId) {
      res.status(400).json({ error: 'Reference solution sourceCode and languageId are required to evaluate test cases' });
      return;
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
      res.status(400).json({ error: 'At least one testcase input is required' });
      return;
    }

    // Auto-generate slug if not specified
    const slug = (customSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existing = await prisma.problem.findUnique({ where: { slug } });
    if (existing) {
      res.status(400).json({ error: `A problem with slug "${slug}" already exists. Please choose a different title or slug.` });
      return;
    }

    // Automatically run the reference solution through Judge0 / Runner to compute outputs
    const evaluatedTestCases = await Judge0Service.generateTestcaseOutputs(
      sourceCode,
      parseInt(languageId, 10),
      testCases,
      timeLimitMs ? parseInt(timeLimitMs, 10) : 2000
    );

    // Save problem and testcases atomically
    const problem = await prisma.problem.create({
      data: {
        title: title.trim(),
        slug,
        description: description.trim(),
        difficulty: difficulty || 'MEDIUM',
        roundId: roundId ? parseInt(roundId, 10) : 1,
        timeLimitMs: timeLimitMs ? parseInt(timeLimitMs, 10) : 2000,
        memoryLimitKb: memoryLimitKb ? parseInt(memoryLimitKb, 10) : 262144,
        testCases: {
          create: evaluatedTestCases.map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput || '',
            isHidden: Boolean(tc.isHidden),
          })),
        },
      },
      include: {
        testCases: true,
        round: true,
      },
    });

    res.status(201).json({
      success: true,
      problem,
      evaluatedCount: evaluatedTestCases.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to author problem' });
  }
});

// GET /api/problems/:id - Get single problem with sample (non-hidden) test cases
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        testCases: {
          where: { isHidden: false },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
          },
        },
      },
    });

    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    const { testCases, ...problemData } = problem;

    res.status(200).json({
      ...problemData,
      sampleTestCases: testCases,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch problem' });
  }
});

export default router;
