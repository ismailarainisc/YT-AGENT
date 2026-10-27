import fs from 'fs';
import { execute, logAudit, logExecution, query, queryOne } from './db.ts';
import { PolicyEngine } from './policy.ts';
import { getAuthoritativeVideoStatus, getValidAccessToken, uploadVideoToYouTube } from './youtube.ts';

let isQueueRunning = false;
let queueInterval: NodeJS.Timeout | null = null;

export interface UploadJobRow {
  id: string;
  channel_id: string;
  title: string;
  description: string;
  tags: string;
  hashtags: string;
  category_id: string;
  privacy_status: 'private' | 'unlisted' | 'public';
  publish_at: string | null;
  made_for_kids: number;
  file_path: string;
  original_filename: string;
  file_size: number;
  duration: number;
  is_short: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  youtube_video_id: string | null;
  verified_status: string | null;
  error_message: string | null;
  retry_count: number;
  autonomous_mode: number;
  recording_date?: string | null;
  created_at: string;
}

/**
 * Initializes and starts the background persistent queue worker
 */
export async function startJobQueueWorker(): Promise<void> {
  if (isQueueRunning) return;
  isQueueRunning = true;

  console.log('[Queue] Initializing persistent job queue worker...');

  // Recovery after restart: any jobs stuck in 'processing' reset to 'pending' if retry_count < 3
  try {
    const interrupted = await query<UploadJobRow>(
      "SELECT * FROM upload_jobs WHERE status = 'processing'"
    );

    for (const job of interrupted) {
      if (job.retry_count < 3) {
        await execute(
          "UPDATE upload_jobs SET status = 'pending', retry_count = retry_count + 1, updated_at = datetime('now') WHERE id = ?",
          [job.id]
        );
        await logExecution(job.id, 'warn', 'Recovered interrupted job after restart, returned to pending state.');
      } else {
        await execute(
          "UPDATE upload_jobs SET status = 'failed', error_message = 'Job interrupted too many times across restarts.', updated_at = datetime('now') WHERE id = ?",
          [job.id]
        );
      }
    }
  } catch (err: any) {
    console.warn('[Queue] Restart recovery notice:', err?.message || err);
  }

  // Poll loop every 3 seconds
  queueInterval = setInterval(async () => {
    await processNextJob();
  }, 3000);
}

export function stopJobQueueWorker(): void {
  if (queueInterval) clearInterval(queueInterval);
  isQueueRunning = false;
}

/**
 * Process the next pending job in the queue.
 * Prioritizes jobs whose scheduled time is now or in the past (or not scheduled).
 * Ensures future-scheduled jobs (present or future years) NEVER block other pending uploads!
 */
async function processNextJob(): Promise<void> {
  try {
    const pendingJobs = await query<UploadJobRow>(
      "SELECT * FROM upload_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 50"
    );

    if (!pendingJobs || pendingJobs.length === 0) return;

    const now = Date.now();
    // Select the oldest pending job that is either not scheduled or whose scheduled time has arrived
    const job = pendingJobs.find((j) => {
      if (!j.publish_at) return true;
      const scheduledTime = new Date(j.publish_at).getTime();
      return isNaN(scheduledTime) || scheduledTime <= now;
    });

    if (!job) {
      // All pending jobs are scheduled for future times or future years
      return;
    }

    // Mark as processing
    await execute(
      "UPDATE upload_jobs SET status = 'processing', progress = 10, updated_at = datetime('now') WHERE id = ?",
      [job.id]
    );
    await logExecution(job.id, 'info', `Started processing upload job "${job.title}"`);

    // Fetch channel & account
    const channel = await queryOne<{ account_id: string; title: string }>(
      'SELECT account_id, title FROM youtube_channels WHERE channel_id = ?',
      [job.channel_id]
    );

    if (!channel) {
      throw new Error(`Channel ${job.channel_id} not found in connected channels.`);
    }

    // Policy Check
    const policyResult = PolicyEngine.evaluatePublishPrivacy({
      requestedPrivacy: job.privacy_status,
      allowPublicOverride: job.privacy_status === 'public' && !job.autonomous_mode,
      scheduledTime: job.publish_at,
      isAutonomous: Boolean(job.autonomous_mode),
    });

    const safePrivacy = policyResult.sanitizedPrivacy;

    if (safePrivacy !== job.privacy_status) {
      await logExecution(
        job.id,
        'warn',
        `Policy Engine enforced safe privacy change: from '${job.privacy_status}' to '${safePrivacy}'.`
      );
    }

    // Get fresh token
    const accessToken = await getValidAccessToken(channel.account_id);

    // Parse tags and hashtags
    const parsedTags = job.tags ? job.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const parsedHashtags = job.hashtags ? job.hashtags.split(' ').map((h) => h.trim()).filter(Boolean) : [];

    // Append hashtags to description if not present
    let fullDescription = job.description || '';
    if (parsedHashtags.length > 0 && !fullDescription.includes(parsedHashtags[0])) {
      fullDescription += '\n\n' + parsedHashtags.join(' ');
    }

    // Execute upload
    await execute("UPDATE upload_jobs SET progress = 40 WHERE id = ?", [job.id]);

    // Check if publishAt is still in the future for YouTube's native scheduler
    const isFutureScheduled = Boolean(job.publish_at && new Date(job.publish_at).getTime() > Date.now());
    const publishAtForYouTube = isFutureScheduled ? new Date(job.publish_at!).toISOString() : null;

    const uploadResult = await uploadVideoToYouTube(
      accessToken,
      job.file_path,
      {
        title: job.title,
        description: fullDescription,
        tags: parsedTags,
        categoryId: job.category_id || '28',
        privacyStatus: safePrivacy,
        madeForKids: Boolean(job.made_for_kids),
        publishAt: publishAtForYouTube,
        recordingDate: job.recording_date || null,
      },
      async (percent) => {
        await execute('UPDATE upload_jobs SET progress = ? WHERE id = ?', [Math.min(90, percent), job.id]);
      }
    );

    const videoId = uploadResult.videoId;
    await execute('UPDATE upload_jobs SET progress = 95, youtube_video_id = ? WHERE id = ?', [videoId, job.id]);

    // Mandatory Authoritative Status Verification
    let verifiedStatus = 'unverified';
    try {
      const liveStatus = await getAuthoritativeVideoStatus(accessToken, videoId);
      const verification = PolicyEngine.verifyAuthoritativeStatus(safePrivacy, liveStatus.privacyStatus);

      if (verification.verified) {
        verifiedStatus = liveStatus.privacyStatus;
        await logExecution(job.id, 'success', `Authoritatively verified video status on YouTube as '${verifiedStatus}'`);
      } else {
        verifiedStatus = 'unverified_warning';
        await logExecution(job.id, 'warn', verification.error || 'Verification warning');
      }
    } catch (verErr: any) {
      console.warn('Could not immediately verify video status:', verErr);
      await logExecution(job.id, 'warn', `Verification pending: ${verErr.message}`);
    }

    // Mark job as completed
    await execute(
      `UPDATE upload_jobs SET 
        status = 'completed', 
        progress = 100, 
        verified_status = ?, 
        updated_at = datetime('now') 
       WHERE id = ?`,
      [verifiedStatus, job.id]
    );

    // Save to uploaded_videos
    await execute(
      `INSERT INTO uploaded_videos (
        id, channel_id, youtube_video_id, title, description, privacy_status, is_short, upload_job_id, verified_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(youtube_video_id) DO UPDATE SET 
        privacy_status = excluded.privacy_status, verified_at = datetime('now')`,
      [
        'vid_' + Date.now(),
        job.channel_id,
        videoId,
        job.title,
        fullDescription,
        safePrivacy,
        job.is_short,
        job.id,
      ]
    );

    await logAudit('video_published', 'agent', {
      jobId: job.id,
      videoId,
      privacy: safePrivacy,
      verified: verifiedStatus,
    });

    // Cleanup temporary file safely
    if (fs.existsSync(job.file_path)) {
      try {
        fs.unlinkSync(job.file_path);
        await logExecution(job.id, 'info', 'Cleaned up temporary upload file.');
      } catch (e) {
        console.warn('Could not unlink temp file:', e);
      }
    }
  } catch (err: any) {
    console.warn('[Queue] Job processing error:', err.message || err);
    // Mark failed
    const failedJob = await queryOne<UploadJobRow>(
      "SELECT id, retry_count FROM upload_jobs WHERE status = 'processing' LIMIT 1"
    );
    if (failedJob) {
      await execute(
        "UPDATE upload_jobs SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?",
        [err.message || 'Unknown error occurred', failedJob.id]
      );
      await logExecution(failedJob.id, 'error', `Job failed: ${err.message}`);
    }
  }
}
