import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Ongoing visit session — crash-survivable storage layer.
//
// A visit's duration is derived from a single immutable epoch anchor
// (`startTimeStamp`) rather than an accumulating counter, so the elapsed time
// survives the screen unmounting, the app being backgrounded for hours, and the
// OS killing the process outright. This module is the durability layer only —
// the app always *reads* the session from the Redux slice (see
// `redux/slices/visitSessionSlice`), never from here.
// ─────────────────────────────────────────────────────────────────────────────

// Versioned in the key itself: a shape change bumps to `_v2` and orphans `_v1`
// rather than needing migration code for a transient record.
export const VISIT_SESSION_KEY = '@monoskin/ongoing_visit_v1';

const SCHEMA_VERSION = 1;

export type VisitTargetType = 'DOCTOR' | 'PHARMACY' | 'LEAD';

export interface OngoingVisit {
    schemaVersion: number;
    /** Correlates "started" and "submitted" in logs when a duration looks wrong. */
    sessionId: string;
    /** Ownership guard — a session must never restore into a different MR's login. */
    mrId: number;
    visitType: VisitTargetType;
    /** doctorId | pharmacyId | leadId, always stringified. */
    targetId: string;
    /** Present only when the visit was launched from a route stop. */
    routeStopId?: number;
    /** THE anchor. Written once at the confirmation tap, never mutated. */
    startTimeStamp: number;
    /** Heartbeat, refreshed on foreground — diagnostics only. */
    lastSeenAt: number;
    metadata: {
        name: string;
        subtitle?: string;
        category?: 'Doctors' | 'Pharmacies';
    };
}

/** Route params for `VisitDetail`, derived from the stored discriminated pair. */
export interface VisitRouteParams {
    doctorId?: string;
    pharmacyId?: string;
    leadId?: string;
    routeStopId?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const createSessionId = (): string =>
    `vs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * The single place the stored `visitType` + `targetId` pair converts back into
 * the three-optional-id shape that `VisitDetail` expects.
 */
export const toVisitRouteParams = (session: OngoingVisit): VisitRouteParams => ({
    doctorId: session.visitType === 'DOCTOR' ? session.targetId : undefined,
    pharmacyId: session.visitType === 'PHARMACY' ? session.targetId : undefined,
    leadId: session.visitType === 'LEAD' ? session.targetId : undefined,
    routeStopId: session.routeStopId,
});

/** True when a stored session is the one the given screen params refer to. */
export const sessionMatchesParams = (
    session: OngoingVisit | null,
    params: { doctorId?: string; pharmacyId?: string; leadId?: string },
): boolean => {
    if (!session) { return false; }
    if (session.visitType === 'DOCTOR') { return params.doctorId === session.targetId; }
    if (session.visitType === 'PHARMACY') { return params.pharmacyId === session.targetId; }
    return params.leadId === session.targetId;
};

/**
 * Distinguishes *why* a record is unusable, because the remedies differ: a
 * corrupt or foreign record must be deleted, but an unresolved owner id must NOT
 * delete anything — the identity may simply not have loaded yet, and wiping the
 * record there silently destroys a live visit.
 *
 * Deliberately does NOT reject on age — a long visit is legitimate — nor on a
 * `startTimeStamp` in the future (a backwards device-clock change is recoverable
 * because the duration is clamped to >= 0 at submit time).
 */
type SessionVerdict = 'valid' | 'corrupt' | 'foreign' | 'owner-unknown';

const verifySession = (raw: unknown, ownerId: number | null): SessionVerdict => {
    if (!raw || typeof raw !== 'object') { return 'corrupt'; }
    const s = raw as Partial<OngoingVisit>;
    if (s.schemaVersion !== SCHEMA_VERSION) { return 'corrupt'; }
    if (typeof s.startTimeStamp !== 'number' || !Number.isFinite(s.startTimeStamp)) { return 'corrupt'; }
    if (typeof s.targetId !== 'string' || !s.targetId) { return 'corrupt'; }
    if (s.visitType !== 'DOCTOR' && s.visitType !== 'PHARMACY' && s.visitType !== 'LEAD') { return 'corrupt'; }
    if (typeof s.mrId !== 'number') { return 'corrupt'; }
    // Identity not resolved yet — inconclusive, so leave the record alone.
    if (ownerId === null) { return 'owner-unknown'; }
    // Shared handsets are common in the field — a session belongs to one MR only.
    if (s.mrId !== ownerId) { return 'foreign'; }
    return 'valid';
};

export const buildSession = (input: {
    mrId: number;
    visitType: VisitTargetType;
    targetId: string | number;
    routeStopId?: number;
    name: string;
    subtitle?: string;
    category?: 'Doctors' | 'Pharmacies';
    startTimeStamp: number;
}): OngoingVisit => ({
    schemaVersion: SCHEMA_VERSION,
    sessionId: createSessionId(),
    mrId: input.mrId,
    visitType: input.visitType,
    targetId: String(input.targetId),
    routeStopId: input.routeStopId,
    startTimeStamp: input.startTimeStamp,
    lastSeenAt: input.startTimeStamp,
    metadata: {
        name: input.name,
        subtitle: input.subtitle,
        category: input.category,
    },
});

// ─── Storage API ─────────────────────────────────────────────────────────────
// Every call is swallowed on failure. A storage error must never block a visit:
// degraded (loses crash-recovery) beats blocked.

export const readVisitSession = async (ownerId: number | null): Promise<OngoingVisit | null> => {
    try {
        const raw = await AsyncStorage.getItem(VISIT_SESSION_KEY);
        if (!raw) { return null; }
        const parsed = JSON.parse(raw);
        const verdict = verifySession(parsed, ownerId);
        if (verdict === 'valid') { return parsed; }

        console.log('🚀 ~ readVisitSession ~ rejected:', verdict, { ownerId, stored: parsed?.mrId });
        // Only a definitively bad record is destroyed. `owner-unknown` keeps the
        // record on disk so it can still be restored once identity resolves.
        if (verdict === 'corrupt' || verdict === 'foreign') {
            await clearVisitSession();
        }
        return null;
    } catch (err) {
        console.log('🚀 ~ readVisitSession ~ error:', err);
        return null;
    }
};

export const writeVisitSession = async (session: OngoingVisit): Promise<void> => {
    try {
        await AsyncStorage.setItem(VISIT_SESSION_KEY, JSON.stringify(session));
    } catch (err) {
        console.log('🚀 ~ writeVisitSession ~ error:', err);
    }
};

export const clearVisitSession = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(VISIT_SESSION_KEY);
    } catch (err) {
        console.log('🚀 ~ clearVisitSession ~ error:', err);
    }
};

/** Refresh the heartbeat without touching the immutable anchor. */
export const touchVisitSession = async (session: OngoingVisit): Promise<void> =>
    writeVisitSession({ ...session, lastSeenAt: Date.now() });
