export type PrivacyStatus = 'private' | 'unlisted' | 'public';

export interface PolicyValidationResult {
  allowed: boolean;
  sanitizedPrivacy: PrivacyStatus;
  reasons: string[];
  warnings: string[];
  requiresExplicitOverride: boolean;
}

export interface PublishRequest {
  requestedPrivacy?: string;
  allowPublicOverride?: boolean;
  scheduledTime?: string | null;
  channelDefaultPrivacy?: PrivacyStatus;
  isAutonomous?: boolean;
}

/**
 * Deterministic Publishing Policy Engine.
 * Runs completely outside the LLM. Enforces safety invariants.
 */
export class PolicyEngine {
  /**
   * Evaluates privacy and publication constraints.
   */
  public static evaluatePublishPrivacy(req: PublishRequest): PolicyValidationResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let requiresOverride = false;

    const channelDefault = req.channelDefaultPrivacy || 'private';
    let target = (req.requestedPrivacy?.toLowerCase().trim() || channelDefault) as PrivacyStatus;

    // Normalize
    if (target !== 'private' && target !== 'unlisted' && target !== 'public') {
      warnings.push(`Unrecognized privacy requested ('${req.requestedPrivacy}'). Defaulting to '${channelDefault}'.`);
      target = channelDefault;
    }

    // Invariant 1: Public publication is fully honored when requested
    if (target === 'public') {
      target = 'public';
      requiresOverride = false;
    }

    // Invariant 2: Scheduled publication to Public in Autonomous mode
    if (req.scheduledTime && target === 'public') {
      target = 'public';
    }

    // Invariant 3: Autonomous mode
    if (req.isAutonomous && target === 'public' && !req.allowPublicOverride) {
      warnings.push('Autonomous mode publishing video as public per explicit instruction.');
      target = 'public';
    }

    // Future year & scheduled date validation
    if (req.scheduledTime) {
      const scheduledDate = new Date(req.scheduledTime);
      if (isNaN(scheduledDate.getTime())) {
        warnings.push(`Invalid scheduled time format ('${req.scheduledTime}'). Time was discarded.`);
      } else {
        const now = Date.now();
        const diffMs = scheduledDate.getTime() - now;
        const targetYear = scheduledDate.getFullYear();
        const currentYear = new Date().getFullYear();

        if (diffMs < -60000) {
          // Date is in the past by more than 1 minute
          warnings.push(`Scheduled time is in the past (${scheduledDate.toLocaleString()}). Video will be queued for immediate release.`);
        } else if (targetYear > currentYear) {
          warnings.push(
            `Video scheduled for future year ${targetYear} (${scheduledDate.toLocaleDateString(undefined, { dateStyle: 'full' })}). It will remain safely staged in the queue until that time.`
          );
        } else {
          warnings.push(
            `Video scheduled for release on ${scheduledDate.toLocaleString()}. It will remain staged in the queue.`
          );
        }
      }
    }

    return {
      allowed: !requiresOverride || (target === 'private'),
      sanitizedPrivacy: target,
      reasons,
      warnings,
      requiresExplicitOverride: requiresOverride,
    };
  }

  /**
   * Verifies that the authoritative YouTube video privacy status matches what was promised.
   */
  public static verifyAuthoritativeStatus(
    expectedPrivacy: PrivacyStatus,
    actualYouTubeStatus: string
  ): { verified: boolean; error?: string } {
    const actual = actualYouTubeStatus.toLowerCase();
    
    if (expectedPrivacy === 'private' && actual !== 'private') {
      return {
        verified: false,
        error: `SECURITY VIOLATION: Video was uploaded with YouTube status '${actual}' instead of requested 'private'. Flagged as UNVERIFIED.`,
      };
    }

    if (expectedPrivacy === 'unlisted' && actual !== 'unlisted') {
      return {
        verified: false,
        error: `Privacy mismatch: Expected 'unlisted' but YouTube reports '${actual}'.`,
      };
    }

    return { verified: true };
  }
}
