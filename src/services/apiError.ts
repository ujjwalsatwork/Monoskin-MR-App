import { AxiosError } from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// One place that answers "what actually went wrong, and can retrying help?".
//
// Before this, every screen did `err?.response?.data?.message || '<generic>'`.
// That optional chain NEVER resolves: the ERP API answers with `{ error: "..." }`
// on every one of its error paths, not `{ message }`. So offline, timeout,
// validation failure and a 500 all produced the same "Something went wrong"
// dialog — which is what drove MRs in weak-signal territories to retry a submit
// the server had already accepted, creating duplicate records.
// ─────────────────────────────────────────────────────────────────────────────

export type ApiFailureKind =
    /** No route to the host — the request never left the device. */
    | 'offline'
    /** Aborted at the client timeout. The server MAY still have processed it. */
    | 'timeout'
    /** 401 / 403 — session expired or not permitted. */
    | 'auth'
    /** 400 / 422 — the payload itself is wrong. Retrying unchanged never helps. */
    | 'validation'
    /** 409 — a real conflict reported by the server. */
    | 'conflict'
    /** 5xx — server fault; the request was well-formed. */
    | 'server'
    /** Anything we can't place. Treated as non-retriable. */
    | 'unknown';

/** Shape the ERP API actually returns on an error. `error` is the real key. */
interface ApiErrorBody {
    error?: unknown;
    message?: unknown;
}

const isAxiosLike = (err: unknown): err is AxiosError =>
    !!err && typeof err === 'object' && ('isAxiosError' in (err as object) || 'config' in (err as object));

/**
 * Classify a rejected request.
 *
 * Order matters: the timeout check must run before the "no response" check,
 * because an aborted request also has no `response`, and the two mean different
 * things — a timeout may have been processed server-side, an offline request
 * definitely was not.
 */
export const classifyApiError = (err: unknown): ApiFailureKind => {
    if (!isAxiosLike(err)) { return 'unknown'; }

    const code = err.code;
    const message = String(err.message ?? '');

    // Client-side abort at `timeout`. Axios reports ECONNABORTED, and older
    // versions only set the message, so match both.
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout of \d+ms exceeded/i.test(message)) {
        return 'timeout';
    }

    const status = err.response?.status;

    // No response at all and not a timeout → the device could not reach the host.
    if (status == null) {
        if (code === 'ERR_NETWORK' || code === 'ENOTFOUND' || code === 'ECONNREFUSED'
            || /network error/i.test(message)) {
            return 'offline';
        }
        // A request that produced neither a response nor a recognised transport
        // code is still, in practice, a connectivity failure on a mobile device.
        return 'offline';
    }

    if (status === 401 || status === 403) { return 'auth'; }
    if (status === 400 || status === 422) { return 'validation'; }
    if (status === 409) { return 'conflict'; }
    if (status >= 500) { return 'server'; }
    return 'unknown';
};

/**
 * True when queuing the request and trying again later can plausibly succeed.
 *
 * `validation` and `auth` are deliberately excluded: an unattended retry of a
 * payload the server has already rejected on its merits will fail forever, and
 * a queue that keeps retrying it hides a lead the MR needs to fix by hand.
 */
export const isRetriable = (kind: ApiFailureKind): boolean =>
    kind === 'offline' || kind === 'timeout' || kind === 'server';

/**
 * True when the request may have reached the server despite the client error.
 * These are exactly the cases where an idempotency key earns its keep.
 */
export const mayHaveReachedServer = (kind: ApiFailureKind): boolean =>
    kind === 'timeout' || kind === 'server';

/** Pull the server's own explanation out, reading the key the API really sends. */
export const extractServerMessage = (err: unknown): string | undefined => {
    if (!isAxiosLike(err)) { return undefined; }
    const data = err.response?.data as ApiErrorBody | string | undefined;
    if (typeof data === 'string') {
        const trimmed = data.trim();
        // An HTML error page is not a message worth showing an MR.
        return trimmed && !trimmed.startsWith('<') ? trimmed : undefined;
    }
    if (!data || typeof data !== 'object') { return undefined; }
    const value = data.error ?? data.message;
    if (typeof value !== 'string') { return undefined; }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * MR-facing copy.
 *
 * `queued` says whether the caller has saved the work locally, because the honest
 * message differs: promising a later submit when nothing was saved is worse than
 * a plain error.
 *
 * Deliberately does NOT promise background submission. React Native runs no JS
 * once the app is killed, so a queued item is sent the next time the MR opens the
 * app with a signal — saying otherwise would be a promise the app cannot keep.
 */
export const messageForKind = (
    kind: ApiFailureKind,
    options: { queued?: boolean; serverMessage?: string; noun?: string } = {},
): string => {
    const { queued = false, serverMessage, noun = 'record' } = options;

    switch (kind) {
        case 'offline':
            return queued
                ? `No internet connection. Your ${noun} is saved — it will be submitted the next time you open the app with a signal.`
                : 'No internet connection. Please check your network and try again.';
        case 'timeout':
            return queued
                ? `The network is too slow to reach the server. Your ${noun} is saved — it will be submitted the next time you open the app with a signal.`
                : 'The network is too slow to reach the server. Please try again when your signal improves.';
        case 'server':
            return queued
                ? `The server could not accept this right now. Your ${noun} is saved and the app will try again.`
                : serverMessage || 'The server could not process this right now. Please try again in a few minutes.';
        case 'auth':
            return serverMessage || 'Your session has expired. Please sign in again.';
        case 'validation':
        case 'conflict':
            return serverMessage || 'Some of the details could not be accepted. Please review and try again.';
        default:
            return serverMessage || 'Something went wrong. Please try again.';
    }
};

/** Short label for a draft row — why this item is stuck. */
export const shortReasonForKind = (kind: ApiFailureKind | null): string => {
    switch (kind) {
        case 'offline': return 'No internet connection';
        case 'timeout': return 'Network too slow';
        case 'server': return 'Server unavailable';
        case 'auth': return 'Session expired';
        case 'validation': return 'Details need correcting';
        case 'conflict': return 'Conflict on the server';
        case 'unknown': return 'Could not be submitted';
        default: return 'Waiting to sync';
    }
};

/**
 * A submit that succeeded is either 201 (created) or 200 (idempotent replay of a
 * submit whose response the app never received). Both mean "the server has it".
 */
export const isSuccessStatus = (status: number | undefined): boolean =>
    status != null && status >= 200 && status < 300;
