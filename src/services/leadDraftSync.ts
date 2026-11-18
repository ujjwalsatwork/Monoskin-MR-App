import apiClient from './apiClient';
import {
    classifyApiError,
    extractServerMessage,
    isRetriable,
    mayHaveReachedServer,
} from './apiError';
import {
    LeadDraft,
    MAX_SYNC_ATTEMPTS,
    isDueForRetry,
    patchLeadDraft,
    readLeadDrafts,
    removeLeadDraft,
} from './leadDraftStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Drains the local lead queue.
//
// Deliberately knows nothing about Redux — the slice drives it and publishes the
// result — so there is no import cycle between state and transport.
//
// What this can and cannot promise: React Native runs no JavaScript once the app
// is killed, so this does NOT send drafts in the background. It runs on app
// launch, on return to the foreground, on the Leads screen gaining focus, and on
// an explicit Retry. In practice an MR opens the app many times a day, so a
// queued lead is filed within minutes of them next having a signal — but no
// message anywhere in the app may claim it happens while the app is closed.
// ─────────────────────────────────────────────────────────────────────────────

export interface FlushSummary {
    /** Accepted by the server on this pass (201 created, or 200 replay). */
    submitted: number;
    /** Moved to the terminal `failed` state on this pass. */
    failed: number;
    /** Still queued when the pass ended. */
    remaining: number;
    /** True when the pass stopped early because the network was clearly down. */
    stoppedOffline: boolean;
}

const EMPTY: FlushSummary = { submitted: 0, failed: 0, remaining: 0, stoppedOffline: false };

// Single-flight. A foreground event and a screen focus can land in the same tick;
// without this the same draft would be posted twice concurrently.
let inFlight: Promise<FlushSummary> | null = null;

/** True while a flush is running — the UI shows a "syncing" state from this. */
export const isFlushInProgress = (): boolean => inFlight !== null;

/**
 * The bridge for a server that has not yet shipped the idempotent POST.
 *
 * An older API answers a replayed `code` with 400 "A record with this value
 * already exists". That is indistinguishable from a real validation failure to
 * the classifier, so confirm against the list: if a lead with this code exists,
 * the submit DID land and the draft is done. Harmless once the API returns 200 —
 * it simply never runs.
 */
const wasActuallyCreated = async (code: string): Promise<boolean> => {
    try {
        const res = await apiClient.get<Array<{ code?: string }>>('/leads');
        const rows = Array.isArray(res.data) ? res.data : [];
        return rows.some(row => String(row?.code ?? '') === code);
    } catch {
        // Cannot confirm — treat as "not created" and let the normal retry rules
        // apply. Never delete a draft on a guess.
        return false;
    }
};

const looksLikeDuplicateCode = (message: string | undefined): boolean =>
    !!message && /already exists|duplicate key|duplicate lead/i.test(message);

/**
 * Attempt one draft.
 *
 * Returns 'sent' when the server has it, 'failed' when it will never succeed
 * unattended, and 'retry' when the network is at fault and the caller should stop
 * the pass — if this draft could not get through, the next one will not either.
 */
const syncOne = async (draft: LeadDraft): Promise<'sent' | 'failed' | 'retry'> => {
    await patchLeadDraft(draft.draftId, {
        status: 'syncing',
        attemptCount: draft.attemptCount + 1,
        lastAttemptAt: Date.now(),
    });

    try {
        // `code` inside the payload is the idempotency key. A 200 means the server
        // already had this lead from an earlier attempt whose response never
        // arrived; a 201 means it was created now. Both mean "done".
        await apiClient.post('/leads', draft.payload);
        await removeLeadDraft(draft.draftId);
        return 'sent';
    } catch (err) {
        const kind = classifyApiError(err);
        const serverMessage = extractServerMessage(err);

        // A submit that may have reached the server, or was rejected as a duplicate
        // code, could already exist. Confirm before deciding anything.
        if (mayHaveReachedServer(kind) || looksLikeDuplicateCode(serverMessage)) {
            if (await wasActuallyCreated(draft.code)) {
                await removeLeadDraft(draft.draftId);
                return 'sent';
            }
        }

        const attempts = draft.attemptCount + 1;
        const exhausted = attempts >= MAX_SYNC_ATTEMPTS;

        if (!isRetriable(kind) || exhausted) {
            await patchLeadDraft(draft.draftId, {
                status: 'failed',
                lastErrorKind: kind,
                lastErrorMessage: serverMessage ?? null,
            });
            return 'failed';
        }

        await patchLeadDraft(draft.draftId, {
            status: 'pending',
            lastErrorKind: kind,
            lastErrorMessage: serverMessage ?? null,
        });
        return 'retry';
    }
};

/**
 * Drain the queue for one MR.
 *
 * Serial by design: a weak link handles one request far better than five at once,
 * and stopping at the first network failure avoids burning every draft's attempt
 * budget on an outage that has nothing to do with them.
 */
export const flushLeadDrafts = async (ownerId: number | null): Promise<FlushSummary> => {
    if (ownerId == null) { return EMPTY; }
    if (inFlight) { return inFlight; }

    const run = (async (): Promise<FlushSummary> => {
        const drafts = await readLeadDrafts(ownerId);
        const due = drafts.filter(d => isDueForRetry(d));

        let submitted = 0;
        let failed = 0;
        let stoppedOffline = false;

        for (const draft of due) {
            const outcome = await syncOne(draft);
            if (outcome === 'sent') { submitted += 1; continue; }
            if (outcome === 'failed') { failed += 1; continue; }
            // Network is down — stop the pass and leave the rest queued.
            stoppedOffline = true;
            break;
        }

        const after = await readLeadDrafts(ownerId);
        return {
            submitted,
            failed,
            remaining: after.filter(d => d.status !== 'failed').length,
            stoppedOffline,
        };
    })();

    inFlight = run;
    try {
        return await run;
    } finally {
        inFlight = null;
    }
};

/**
 * Push one specific draft, ignoring its backoff window.
 *
 * This is the MR tapping Retry. They are standing there watching, so honour the
 * request immediately rather than making them wait out an exponential delay, and
 * reset the attempt budget so a manual retry never lands on an already-exhausted
 * draft that refuses to move.
 */
export const retryLeadDraftNow = async (draftId: string, ownerId: number | null): Promise<FlushSummary> => {
    if (ownerId == null) { return EMPTY; }
    await patchLeadDraft(draftId, { status: 'pending', attemptCount: 0, lastAttemptAt: null });
    return flushLeadDrafts(ownerId);
};
