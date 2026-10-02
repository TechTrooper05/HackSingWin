import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

async function testAccepted() {
  console.log('🧪 Testing Correct Solution for Two Sum to Verify [ACCEPTED] Verdict...');

  const loginRes = await axios.post(`${API_BASE}/auth/login`, {
    username: 'team1_member_a',
    password: 'pass123',
  });
  const token = loginRes.data.token;

  const problemsRes = await axios.get(`${API_BASE}/problems`);
  const twoSum = problemsRes.data.problems.find((p: any) => p.slug === 'two-sum');

  const solutionCode = `import sys

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    n = int(lines[0])
    nums = [int(x) for x in lines[1:n+1]]
    target = int(lines[n+1])
    seen = {}
    for i, x in enumerate(nums):
        diff = target - x
        if diff in seen:
            print(f"{seen[diff]} {i}")
            return
        seen[x] = i

solve()
`;

  // Wait 5s for rate-limit cooldown to clear
  console.log('   Waiting 5 seconds for rate limit to clear...');
  await new Promise((r) => setTimeout(r, 5500));

  // 1. Dry run
  const runRes = await axios.post(
    `${API_BASE}/submissions/run`,
    {
      problemId: twoSum.id,
      code: solutionCode,
      languageId: 71,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  console.log('   ✓ Dry Run allPassed:', runRes.data.allPassed);
  runRes.data.results.forEach((r: any) => {
    console.log(`     - Sample ${r.index}: expected="${r.expectedOutput}", actual="${r.actualOutput}", passed=${r.passed}`);
  });

  // Wait 5s for rate-limit cooldown
  await new Promise((r) => setTimeout(r, 5500));

  // 2. Official submit
  const submitRes = await axios.post(
    `${API_BASE}/submissions`,
    {
      problemId: twoSum.id,
      code: solutionCode,
      languageId: 71,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const sub = submitRes.data.submission;
  console.log('   ✓ Official Submission Verdict:', {
    submissionId: sub.submissionId,
    status: sub.status,
    score: sub.score,
    passed: `${sub.testCasesPassed} / ${sub.totalTestCases}`,
  });

  if (sub.status === 'ACCEPTED' && sub.score === 100) {
    console.log('\n🎉 FULL ACCEPTED PIPELINE VERIFIED SUCCESSFULLY: 100/100 PTS');
    process.exit(0);
  } else {
    console.error('❌ Expected ACCEPTED but received:', sub);
    process.exit(1);
  }
}

testAccepted().catch((err) => {
  console.error('Error:', err.response?.data || err.message);
  process.exit(1);
});
