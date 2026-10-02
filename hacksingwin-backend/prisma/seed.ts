import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data in reverse order of dependencies
  await prisma.telemetryLog.deleteMany();
  await prisma.codeSnapshot.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.testCase.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const defaultPasswordHash = await bcrypt.hash('pass123', salt);
  const adminPasswordHash = await bcrypt.hash('admin123', salt);

  // 1. Create Admin Team & Admin User
  const adminTeam = await prisma.team.create({
    data: {
      name: 'Organizers',
      passCode: 'admin-pass',
    },
  });

  await prisma.user.create({
    data: {
      username: 'organizer_main',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      teamId: adminTeam.id,
    },
  });

  // 2. Create Participant Teams (Teams 1 through 3)
  for (let i = 1; i <= 3; i++) {
    const team = await prisma.team.create({
      data: {
        name: `Team-${i}`,
        passCode: `passcode${i}`,
        members: {
          create: [
            {
              username: `team${i}_member_a`,
              passwordHash: defaultPasswordHash,
              role: 'PARTICIPANT',
            },
            {
              username: `team${i}_member_b`,
              passwordHash: defaultPasswordHash,
              role: 'PARTICIPANT',
            },
          ],
        },
      },
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });

    // Default Player A as the initial editor with write token
    await prisma.team.update({
      where: { id: team.id },
      data: {
        currentEditorId: team.members[0].id,
        lockGeneration: 1,
      },
    });

    console.log(`Created Team: ${team.name} (passCode: passcode${i}) with 2 members.`);
  }

  // 3. Create Sample Problems with visible and hidden test cases
  const twoSum = await prisma.problem.create({
    data: {
      title: 'Two Sum',
      slug: 'two-sum',
      description: `## Problem Description
Given an array of integers \`nums\` and an integer \`target\`, return the indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice. You can return the answer in any order.

### Input Format
- First line contains $N$ (number of elements)
- Second line contains $N$ space-separated integers
- Third line contains \`target\`

### Output Format
- Two space-separated indices (0-indexed)

### Example 1
**Input:**
\`\`\`
4
2 7 11 15
9
\`\`\`
**Output:**
\`\`\`
0 1
\`\`\`
`,
      difficulty: 'EASY',
      timeLimitMs: 1000,
      memoryLimitKb: 65536,
      testCases: {
        create: [
          {
            input: '4\n2 7 11 15\n9',
            expectedOutput: '0 1',
            isHidden: false,
          },
          {
            input: '3\n3 2 4\n6',
            expectedOutput: '1 2',
            isHidden: true,
          },
          {
            input: '2\n3 3\n6',
            expectedOutput: '0 1',
            isHidden: true,
          },
        ],
      },
    },
  });

  console.log(`Created Problem: ${twoSum.title} (${twoSum.slug}) with 3 test cases.`);
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
