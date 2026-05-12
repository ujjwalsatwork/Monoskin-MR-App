import dayjs from 'dayjs';

// ─── Raw API shape ────────────────────────────────────────────────────────────

export interface AttendanceApiRecord {
    id: number;
    mrId: number;
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    location: string | null;
    latitude?: number | null;
    longitude?: number | null;
    notes: string | null;
    createdAt: string;
}

// ─── Formatted shapes ─────────────────────────────────────────────────────────

export interface AttendanceDayItem {
    id: string;
    date: string;
    day: string;
    isToday: boolean;
    status: 'PRESENT' | 'LATE' | 'ABSENT';
    sessions: PairedSession[];   // merged, UI-ready
    firstCheckIn: string;
    lastCheckOut: string;
}

// kept for backward compat
export interface AttendanceHistoryItem {
    id: string;
    date: string;
    day: string;
    isToday: boolean;
    status: 'PRESENT' | 'LATE' | 'ABSENT';
    timeIn: string;
    timeOut: string;
}

// ─── Session merging ──────────────────────────────────────────────────────────

export interface PairedSession {
    checkIn: string | null;   // "09:15 AM", or null for orphan check-outs
    checkOut: string | null;  // "05:30 PM", or null if session still active
    isActive: boolean;        // true = no check-out recorded yet
}

/**
 * Converts a flat list of split check-in / check-out records (one field set,
 * the other null) into chronologically-paired sessions.
 *
 * Pairing rule: FIFO — earliest check-in is paired with the earliest following
 * check-out. Records that already carry both fields (legacy format) are passed
 * through unchanged.
 */
export const mergeIntoPairedSessions = (
    records: AttendanceApiRecord[],
): PairedSession[] => {
    // Sort by createdAt so events are processed in wall-clock order
    const sorted = [...records].sort(
        (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
    );

    const result: PairedSession[] = [];
    // Queue of check-in times waiting to be paired with a check-out
    const openQueue: Array<string | null> = [];

    for (const record of sorted) {
        const hasIn = record.checkIn != null;
        const hasOut = record.checkOut != null;

        if (hasIn && !hasOut) {
            // Pure check-in — open a new pending session
            openQueue.push(formatSessionTime(record.checkIn));
        } else if (hasOut && !hasIn) {
            // Pure check-out — close the oldest open session (FIFO)
            result.push({
                checkIn: openQueue.shift() ?? null,
                checkOut: formatSessionTime(record.checkOut),
                isActive: false,
            });
        } else if (hasIn && hasOut) {
            // Legacy single-record: both fields present, push directly
            result.push({
                checkIn: formatSessionTime(record.checkIn),
                checkOut: formatSessionTime(record.checkOut),
                isActive: false,
            });
        }
        // records with both null are skipped (no useful data)
    }

    // Drain any unpaired check-ins — these are active (still checked in)
    for (const pendingCheckIn of openQueue) {
        result.push({ checkIn: pendingCheckIn, checkOut: null, isActive: true });
    }

    return result;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Handles both "HH:mm" / "HH:mm:ss" bare-time strings and full ISO datetimes.
 * Returns null (not a placeholder string) so callers can distinguish missing
 * from formatted.
 */
export const formatSessionTime = (value: string | null | undefined): string | null => {
    if (!value) return null;
    // Try ISO / full datetime first ("2026-04-23T09:15:00.000Z")
    let parsed = dayjs(value);
    if (!parsed.isValid()) {
        // Fall back for bare time strings ("09:15", "09:15:00")
        parsed = dayjs(`2000-01-01T${value}`);
    }
    return parsed.isValid() ? parsed.format('hh:mm A') : null;
};

const formatTime = (time: string | null | undefined): string => {
    return formatSessionTime(time) ?? '--:-- --';
};

const normalizeStatus = (status: string): AttendanceDayItem['status'] => {
    const upper = status.toUpperCase();
    if (upper === 'PRESENT') return 'PRESENT';
    if (upper === 'LATE') return 'LATE';
    return 'ABSENT';
};

// ─── Primary transformer ──────────────────────────────────────────────────────

export const transformAttendanceDays = (
    apiData: AttendanceApiRecord[],
): AttendanceDayItem[] => {
    const today = dayjs().format('YYYY-MM-DD');

    const grouped = new Map<string, AttendanceApiRecord[]>();
    for (const record of apiData) {
        const bucket = grouped.get(record.date) ?? [];
        bucket.push(record);
        grouped.set(record.date, bucket);
    }

    const result: AttendanceDayItem[] = [];

    grouped.forEach((records, date) => {
        // mergeIntoPairedSessions sorts by createdAt internally
        const sessions = mergeIntoPairedSessions(records);

        const checkIns = records
            .map((r) => r.checkIn)
            .filter((t): t is string => !!t);
        const checkOuts = records
            .map((r) => r.checkOut)
            .filter((t): t is string => !!t);

        const earliestCheckIn =
            checkIns.length > 0
                ? checkIns.reduce((a, b) => (a < b ? a : b))
                : null;
        const latestCheckOut =
            checkOuts.length > 0
                ? checkOuts.reduce((a, b) => (a > b ? a : b))
                : null;

        const representativeStatus =
            records.find((r) => r.status.toUpperCase() !== 'ABSENT')?.status ??
            records[0].status;

        result.push({
            id: date,
            date: dayjs(date).format('MMM DD, YYYY'),
            day: dayjs(date).format('dddd'),
            isToday: date === today,
            status: normalizeStatus(representativeStatus),
            sessions,
            firstCheckIn: formatTime(earliestCheckIn),
            lastCheckOut: formatTime(latestCheckOut),
        });
    });

    result.sort((a, b) => {
        const da = dayjs(a.date, 'MMM DD, YYYY');
        const db = dayjs(b.date, 'MMM DD, YYYY');
        return db.valueOf() - da.valueOf();
    });

    return result;
};

// ─── Break duration helpers ───────────────────────────────────────────────────

/** Formats a minute count into a human-readable string, e.g. "15 min" or "1 hr 20 min". */
export const formatBreakDuration = (minutes: number): string => {
    if (minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
};

/**
 * Formats a total-seconds count into a human-readable string with second precision.
 * e.g. 90 → "1 min 30 sec", 3661 → "1 hr 1 min 1 sec", 45 → "45 sec"
 */
export const formatDurationSeconds = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '0 sec';
    const s = totalSeconds % 60;
    const totalMins = Math.floor(totalSeconds / 60);
    const m = totalMins % 60;
    const h = Math.floor(totalMins / 60);
    const parts: string[] = [];
    if (h > 0) parts.push(`${h} hr`);
    if (m > 0) parts.push(`${m} min`);
    if (s > 0 || parts.length === 0) parts.push(`${s} sec`);
    return parts.join(' ');
};

/** Formats elapsed seconds into MM:SS or HH:MM:SS for a live timer display. */
export const formatElapsedSeconds = (totalSeconds: number): string => {
    const s = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const m = totalMinutes % 60;
    const h = Math.floor(totalMinutes / 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

// ─── Legacy compat ────────────────────────────────────────────────────────────

export const transformAttendanceData = (
    apiData: AttendanceApiRecord[],
): AttendanceHistoryItem[] =>
    transformAttendanceDays(apiData).map((d) => ({
        id: d.id,
        date: d.date,
        day: d.day,
        isToday: d.isToday,
        status: d.status,
        timeIn: d.firstCheckIn,
        timeOut: d.lastCheckOut,
    }));
