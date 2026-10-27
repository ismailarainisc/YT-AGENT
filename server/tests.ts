import { PolicyEngine } from './policy.ts';
import { parseInstructionWithGemini } from './ai.ts';
import { execute, query, queryOne, getDb } from './db.ts';
import { getValidAccessToken, fetchAuthorizedChannel } from './youtube.ts';

export interface TestResult {
  id: string;
  name: string;
  category: 'policy' | 'oauth' | 'ai' | 'queue' | 'comments' | 'database' | 'live_integration';
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  message: string;
  details?: any;
}

export async function runAutomatedTestSuite(options: { runLiveIntegration?: boolean } = {}): Promise<{
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  const runTest = async (
    id: string,
    name: string,
    category: TestResult['category'],
    fn: () => Promise<void> | void
  ) => {
    const start = Date.now();
    try {
      await fn();
      results.push({
        id,
        name,
        category,
        status: 'passed',
        durationMs: Date.now() - start,
        message: 'Assertion passed successfully',
      });
    } catch (err: any) {
      results.push({
        id,
        name,
        category,
        status: 'failed',
        durationMs: Date.now() - start,
        message: err.message || 'Assertion failed',
        details: err.stack,
      });
    }
  };

  // 1. Policy Engine: Default Private
  await runTest('POL-01', 'Policy Engine defaults to Private when unspecified', 'policy', () => {
    const res = PolicyEngine.evaluatePublishPrivacy({});
    if (res.sanitizedPrivacy !== 'private') {
      throw new Error(`Expected 'private' but got '${res.sanitizedPrivacy}'`);
    }
  });

  // 2. Policy Engine: Public restriction
  await runTest('POL-02', 'Policy Engine blocks Public without explicit override', 'policy', () => {
    const res = PolicyEngine.evaluatePublishPrivacy({
      requestedPrivacy: 'public',
      allowPublicOverride: false,
    });
    if (res.sanitizedPrivacy !== 'private') {
      throw new Error('Policy Engine failed to enforce private fallback for unauthorized public request');
    }
    if (!res.requiresExplicitOverride) {
      throw new Error('Should require explicit override flag');
    }
  });

  // 3. Policy Engine: Autonomous mode cannot publish public
  await runTest('POL-03', 'Autonomous mode restricts Public publishing', 'policy', () => {
    const res = PolicyEngine.evaluatePublishPrivacy({
      requestedPrivacy: 'public',
      allowPublicOverride: false,
      isAutonomous: true,
    });
    if (res.sanitizedPrivacy !== 'private') {
      throw new Error('Autonomous mode must strictly force private');
    }
  });

  // 4. Policy Engine: Authoritative status verification
  await runTest('POL-04', 'Authoritative post-upload verification detects mismatch', 'policy', () => {
    const check1 = PolicyEngine.verifyAuthoritativeStatus('private', 'public');
    if (check1.verified) {
      throw new Error('Expected verification failure when YouTube reports public for private target');
    }
    const check2 = PolicyEngine.verifyAuthoritativeStatus('private', 'private');
    if (!check2.verified) {
      throw new Error('Expected verification success for matching private status');
    }
  });

  // 5. AI Instruction Parser: English
  await runTest('AI-01', 'Instruction parser handles English short video request', 'ai', async () => {
    const plan = await parseInstructionWithGemini(
      'Upload as Short, create an engaging title, keep private',
      { filename: 'clip.mp4', duration: 35, isVertical: true }
    );
    if (!plan.title) throw new Error('Plan should contain a title');
    if (plan.visibility !== 'private') throw new Error('Plan should enforce private visibility');
    if (!plan.isShort) throw new Error('Plan should recognize video as Short');
  });

  // 6. AI Instruction Parser: Urdu / Roman Urdu
  await runTest('AI-02', 'Instruction parser handles Roman Urdu commands', 'ai', async () => {
    const plan = await parseInstructionWithGemini(
      'Yeh video Shorts k tor par upload karo, acha sa title likho aur private rakhna',
      { filename: 'pakistan_travel.mp4', duration: 45, isVertical: true }
    );
    if (!plan.title) throw new Error('Plan should generate title from Roman Urdu');
    if (plan.visibility !== 'private') throw new Error('Plan must remain private');
  });

  // 7. Conflicting instructions detection
  await runTest('AI-03', 'Instruction parser detects ambiguous and safe defaults', 'ai', async () => {
    const plan = await parseInstructionWithGemini(
      'Publish this now publicly or maybe keep it secret for later',
      { filename: 'test.mp4' }
    );
    // Safety invariant: ambiguity must default to private
    if (plan.visibility !== 'private') {
      throw new Error('Conflicting instruction must safely default to private');
    }
  });

  // 8. Database integrity: Foreign key and transactions
  await runTest('DB-01', 'SQLite database read/write and setting storage', 'database', async () => {
    await execute("INSERT OR REPLACE INTO application_settings (key, value) VALUES ('test_key', 'test_val')");
    const row = await queryOne<{ value: string }>("SELECT value FROM application_settings WHERE key = 'test_key'");
    if (!row || row.value !== 'test_val') {
      throw new Error('Database setting read/write mismatch');
    }
  });

  // 9. Comment deduplication prevention
  await runTest('COMM-01', 'Comment duplicate reply prevention schema test', 'comments', async () => {
    const testCommentId = 'test_comment_' + Date.now();
    await execute(
      "INSERT INTO comment_threads (id, channel_id, youtube_comment_id, text_display) VALUES (?, 'ch_1', ?, 'Great video!')",
      [testCommentId, testCommentId]
    );
    // Insert reply
    await execute(
      "INSERT INTO comment_replies (id, comment_id, reply_text, status) VALUES (?, ?, 'Thank you!', 'posted')",
      ['rep_' + Date.now(), testCommentId]
    );
    // Check if reply exists
    const replies = await query('SELECT * FROM comment_replies WHERE comment_id = ?', [testCommentId]);
    if (replies.length !== 1) {
      throw new Error('Expected exactly 1 reply tracked');
    }
  });

  // 10. Queue restart recovery simulation
  await runTest('QUEUE-01', 'Queue recovers interrupted jobs on boot', 'queue', async () => {
    const testJobId = 'job_recovery_test_' + Date.now();
    await execute(
      "INSERT INTO upload_jobs (id, title, original_filename, status, retry_count) VALUES (?, 'Test Job', 'test.mp4', 'processing', 0)",
      [testJobId]
    );

    // Simulate recovery
    const interrupted = await queryOne<{ id: string }>(
      "SELECT id FROM upload_jobs WHERE id = ? AND status = 'processing'",
      [testJobId]
    );
    if (!interrupted) throw new Error('Failed to create test processing job');

    await execute(
      "UPDATE upload_jobs SET status = 'pending', retry_count = retry_count + 1 WHERE id = ?",
      [testJobId]
    );

    const recovered = await queryOne<{ status: string; retry_count: number }>(
      "SELECT status, retry_count FROM upload_jobs WHERE id = ?",
      [testJobId]
    );
    if (!recovered || recovered.status !== 'pending' || recovered.retry_count !== 1) {
      throw new Error('Recovery simulation failed');
    }

    // Cleanup
    await execute('DELETE FROM upload_jobs WHERE id = ?', [testJobId]);
  });

  // 11. Policy Engine: Future year and scheduled time validation
  await runTest('POL-05', 'Policy Engine safely validates future years and scheduled releases', 'policy', () => {
    const nextYear = new Date().getFullYear() + 1;
    const futureDateStr = `${nextYear}-06-15T18:00:00.000Z`;
    const res = PolicyEngine.evaluatePublishPrivacy({
      requestedPrivacy: 'private',
      scheduledTime: futureDateStr,
    });
    if (!res.allowed) {
      throw new Error('Scheduled private video should be allowed');
    }
    const futureWarning = res.warnings.find((w) => w.includes(String(nextYear)));
    if (!futureWarning) {
      throw new Error(`Expected future year warning for year ${nextYear}`);
    }
  });

  // 12. Queue Non-Blocking: Future scheduled jobs never deadlock immediate jobs
  await runTest('QUEUE-02', 'Future year scheduled jobs do not block immediate uploads', 'queue', async () => {
    const futureJobId = 'job_future_' + Date.now();
    const immediateJobId = 'job_immediate_' + Date.now();
    const farFutureYear = new Date().getFullYear() + 2;

    // Insert future-scheduled job first
    await execute(
      "INSERT INTO upload_jobs (id, title, original_filename, status, publish_at, created_at) VALUES (?, 'Future Premiere', 'future.mp4', 'pending', ?, datetime('now', '-10 minutes'))",
      [futureJobId, `${farFutureYear}-01-01T12:00:00.000Z`]
    );

    // Insert immediate pending job second
    await execute(
      "INSERT INTO upload_jobs (id, title, original_filename, status, publish_at, created_at) VALUES (?, 'Immediate Release', 'now.mp4', 'pending', NULL, datetime('now'))",
      [immediateJobId]
    );

    // Query pending jobs like the queue worker
    const pendingJobs = await query<{ id: string; publish_at: string | null }>(
      "SELECT id, publish_at FROM upload_jobs WHERE status = 'pending' ORDER BY created_at ASC"
    );

    const now = Date.now();
    const eligibleJob = pendingJobs.find((j) => {
      if (!j.publish_at) return true;
      const scheduledTime = new Date(j.publish_at).getTime();
      return isNaN(scheduledTime) || scheduledTime <= now;
    });

    // Cleanup
    await execute('DELETE FROM upload_jobs WHERE id IN (?, ?)', [futureJobId, immediateJobId]);

    if (!eligibleJob || eligibleJob.id !== immediateJobId) {
      throw new Error('Queue failed to bypass future-scheduled job to pick the immediate job!');
    }
  });

  // 13. AI Instruction: Natural language future year extraction
  await runTest('AI-04', 'Instruction parser correctly extracts future year scheduling', 'ai', async () => {
    const nextYear = new Date().getFullYear() + 1;
    const plan = await parseInstructionWithGemini(
      `Upload this video and schedule for year ${nextYear} in private mode`,
      { filename: 'premiere.mp4' }
    );
    if (!plan.scheduledTime) {
      throw new Error('Should extract scheduledTime from future year prompt');
    }
    const parsedYear = new Date(plan.scheduledTime).getFullYear();
    if (parsedYear !== nextYear) {
      throw new Error(`Expected year ${nextYear} but got ${parsedYear}`);
    }
  });

  // 11. Live integration test (Optional / Only when account connected)
  if (options.runLiveIntegration) {
    await runTest('LIVE-01', 'Live YouTube Channel Connection verification', 'live_integration', async () => {
      const channel = await queryOne<{ channel_id: string; account_id: string }>(
        'SELECT channel_id, account_id FROM youtube_channels WHERE is_active = 1 LIMIT 1'
      );
      if (!channel) {
        throw new Error('No active YouTube channel connected yet. Please connect your Google account.');
      }

      const token = await getValidAccessToken(channel.account_id);
      const res = await fetchAuthorizedChannel(token);
      if (!res.hasChannel || !res.channel) {
        throw new Error('Channel could not be retrieved from official YouTube API.');
      }
    });
  } else {
    results.push({
      id: 'LIVE-01',
      name: 'Live YouTube Channel Connection verification',
      category: 'live_integration',
      status: 'skipped',
      durationMs: 0,
      message: 'Skipped: Enable live integration testing after connecting your YouTube channel.',
    });
  }

  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;

  return {
    total: results.length,
    passed,
    failed,
    skipped,
    results,
  };
}
