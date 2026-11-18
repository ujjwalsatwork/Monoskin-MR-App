import {
    LEAD_DRAFTS_KEY,
    clearAllLeadDrafts,
    purgeExpiredLeadDrafts,
} from './leadDraftStorage';
import { VISIT_REPORT_KEY, clearVisitReport } from './visitReportStorage';
import { VISIT_SESSION_KEY, clearVisitSession } from './visitSessionStorage';
import { destroySecureStores } from './secureStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Retention policy for everything the app keeps on the handset (MOB-09).
//
// The app is not the system of record — the ERP is. What lives here is a small
// working set that exists so an MR does not lose work when the signal drops. The
// gap the assessment found was that the set had no upper bound: a draft written
// in a dead zone and never synced stayed readable on that phone forever.
//
// Two mechanisms, deliberately separate:
//   • an automatic sweep at launch, which only removes records past their window;
//   • an explicit wipe, for when a handset changes hands.
// ─────────────────────────────────────────────────────────────────────────────

/** Every key this app owns in local storage. The wipe list must stay exhaustive. */
const ALL_LOCAL_KEYS = [LEAD_DRAFTS_KEY, VISIT_SESSION_KEY, VISIT_REPORT_KEY];

export interface RetentionSweepResult {
    expiredDrafts: number;
}

/**
 * Automatic sweep. Safe to call on every launch, and cheap when there is nothing
 * to do. Never touches a record that is still inside its window, so an MR who has
 * been offline for a week keeps every queued lead.
 *
 * The in-progress visit is deliberately NOT aged out here: a visit is already
 * cleared on submit and on sign-out, and a long visit is legitimate. The draft
 * report carries its own 24-hour window inside `visitReportStorage`.
 */
export const runRetentionSweep = async (): Promise<RetentionSweepResult> => {
    try {
        return { expiredDrafts: await purgeExpiredLeadDrafts() };
    } catch (err) {
        console.log('🚀 ~ runRetentionSweep ~ error:', err);
        return { expiredDrafts: 0 };
    }
};

/**
 * Remove everything this app has stored on the handset, for every MR, and drop
 * the encryption key with it so nothing recoverable is left in free space.
 *
 * This is the handset-reassignment action. It is destructive by design: unsent
 * leads go too, which is why it sits behind an explicit confirmation in Profile
 * and is never wired to sign-out.
 */
export const clearAllLocalData = async (): Promise<void> => {
    await clearAllLeadDrafts();
    await clearVisitSession();
    await clearVisitReport();
    // Belt and braces: drop the raw keys as well as the key material, so a store
    // added later without being added to `ALL_LOCAL_KEYS` still loses its key.
    await destroySecureStores(ALL_LOCAL_KEYS);
};
