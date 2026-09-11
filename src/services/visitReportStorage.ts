import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// In-progress visit report — crash-survivable snapshot.
//
// `visitSessionStorage` already keeps the visit ALIVE across an OS kill: the MR
// reopens the app and lands back on their running visit with the timer intact.
// But only the timer anchor was persisted, so everything they had typed — notes,
// sample quantities, timings, photos — was gone, and they had to rebuild the
// whole report from memory.
//
// This stores the report body itself, written on a debounce as the MR fills it
// in and cleared the moment the report is accepted. Deliberately separate from
// the session record: the session is a small, hot, frequently-read fact, while
// this is a larger blob only read once, at restore.
//
// Purely local, exactly like the lead drafts — the server learns nothing until
// the report submits.
// ─────────────────────────────────────────────────────────────────────────────

export const VISIT_REPORT_KEY = '@monoskin/visit_report_v1';

const SCHEMA_VERSION = 1;

/**
 * Discard a snapshot older than this. A report belongs to the visit that was
 * running when it was written; a stale one from days ago would silently refill a
 * new visit with someone else's answers.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface VisitReportSnapshot {
    schemaVersion: number;
    /** Ownership guard — shared handsets are common in the field. */
    mrId: number;
    /**
     * Which visit this belongs to. Rebuilt from the same discriminated pair the
     * session uses, so a snapshot can never be restored onto a different contact.
     */
    targetKey: string;
    savedAt: number;
    report: {
        visitType: string;
        outcome: string;
        visitNote: string;
        clinicConsultationTime: string;
        mrInteractionTime: string;
        doctorArrivalTime: string;
        followUpDate: string;
        revisitOn: string;
        objections: string[];
        sampleProducts: unknown[];
        preferredProducts: unknown[];
        /**
         * Local file URIs. Best-effort only — the OS can reclaim the cache
         * directory between an app kill and the relaunch, in which case the URI no
         * longer resolves. The report body is what this exists to protect.
         */
        attachments: unknown[];
    };
}

/** Stable identity for "which visit is this report for". */
export const visitTargetKey = (params: {
    doctorId?: string;
    pharmacyId?: string;
    leadId?: string;
}): string => {
    if (params.doctorId) { return `doctor:${params.doctorId}`; }
    if (params.pharmacyId) { return `pharmacy:${params.pharmacyId}`; }
    if (params.leadId) { return `lead:${params.leadId}`; }
    return 'unknown';
};

const isValid = (raw: unknown): raw is VisitReportSnapshot => {
    if (!raw || typeof raw !== 'object') { return false; }
    const s = raw as Partial<VisitReportSnapshot>;
    if (s.schemaVersion !== SCHEMA_VERSION) { return false; }
    if (typeof s.mrId !== 'number') { return false; }
    if (typeof s.targetKey !== 'string' || !s.targetKey) { return false; }
    if (typeof s.savedAt !== 'number') { return false; }
    if (!s.report || typeof s.report !== 'object') { return false; }
    return true;
};

/**
 * Read the snapshot for one visit.
 *
 * Returns null unless the owner AND the target both match — a report is only ever
 * restored onto the exact visit it was written for. Every failure is swallowed:
 * losing a restore is a bad day, blocking the visit screen is a worse one.
 */
export const readVisitReport = async (
    ownerId: number | null,
    targetKey: string,
): Promise<VisitReportSnapshot['report'] | null> => {
    if (ownerId == null) { return null; }
    try {
        const raw = await AsyncStorage.getItem(VISIT_REPORT_KEY);
        if (!raw) { return null; }
        const parsed = JSON.parse(raw);
        if (!isValid(parsed)) { await clearVisitReport(); return null; }
        if (parsed.mrId !== ownerId || parsed.targetKey !== targetKey) { return null; }
        if (Date.now() - parsed.savedAt > MAX_AGE_MS) { await clearVisitReport(); return null; }
        return parsed.report;
    } catch (err) {
        console.log('🚀 ~ readVisitReport ~ error:', err);
        return null;
    }
};

export const writeVisitReport = async (
    ownerId: number | null,
    targetKey: string,
    report: VisitReportSnapshot['report'],
): Promise<void> => {
    if (ownerId == null) { return; }
    try {
        const snapshot: VisitReportSnapshot = {
            schemaVersion: SCHEMA_VERSION,
            mrId: ownerId,
            targetKey,
            savedAt: Date.now(),
            report,
        };
        await AsyncStorage.setItem(VISIT_REPORT_KEY, JSON.stringify(snapshot));
    } catch (err) {
        console.log('🚀 ~ writeVisitReport ~ error:', err);
    }
};

export const clearVisitReport = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(VISIT_REPORT_KEY);
    } catch (err) {
        console.log('🚀 ~ clearVisitReport ~ error:', err);
    }
};
