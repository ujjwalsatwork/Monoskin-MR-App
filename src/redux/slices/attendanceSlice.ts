import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { RootState } from '@/redux/store';
import {
    mergeIntoPairedSessions,
    formatSessionTime,
    PairedSession,
    AttendanceApiRecord,
} from '@/utils/attendanceFormatter';

// ─── Types ────────────────────────────────────────────────────────────────────

// Raw shape returned by the POST /mr-attendance endpoint
export interface AttendanceSession {
    id: number;
    checkIn: string | null;   // raw "HH:mm" or ISO — used for currentSession display
    checkOut: string | null;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
}

// Shape returned by GET /mr-attendance/today
// sessions[] is a flat list of split records that mergeIntoPairedSessions pairs up
export interface TodayAttendanceStatus {
    isCheckedIn: boolean;
    currentSession: AttendanceSession | null;
    sessions: AttendanceApiRecord[];
}

export interface LogAttendancePayload {
    action: 'check-in' | 'check-out';
    location: string;
}

export interface AttendanceError {
    message: string;
    status?: number;
}

interface AttendanceState {
    checkInLoading: boolean;
    checkOutLoading: boolean;
    todayLoading: boolean;
    isCheckedIn: boolean;
    currentSession: AttendanceSession | null;
    sessions: PairedSession[];            // UI-ready merged sessions for today
    error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        fallback
    );
};

const extractErrorStatus = (error: unknown): number | undefined =>
    (error as AxiosError).response?.status;

/**
 * Derives isCheckedIn, currentSession, and merged sessions purely from the raw
 * API records — never trusting the backend's isCheckedIn / currentSession flags.
 *
 * Logic:
 *  - Merge flat check-in/check-out records into paired sessions via FIFO.
 *  - The last session is "active" (isActive = true) iff it has a checkIn but no checkOut.
 *  - currentSession is reconstructed from the matching raw record so we always
 *    have the correct id / location / coordinates.
 */
const deriveFromRecords = (
    records: AttendanceApiRecord[],
): { isCheckedIn: boolean; currentSession: AttendanceSession | null; sessions: PairedSession[] } => {
    const sessions = mergeIntoPairedSessions(records);
    const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
    const isCheckedIn = lastSession?.isActive ?? false;

    let currentSession: AttendanceSession | null = null;

    if (isCheckedIn) {
        // Sort records in wall-clock order (same order mergeIntoPairedSessions uses)
        const sorted = [...records].sort(
            (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
        );

        // Each pure check-out record has already consumed one check-in (FIFO).
        // Skip that many check-ins to land on the first unmatched (active) one.
        const pairedCount = sorted.filter(r => r.checkOut !== null && r.checkIn === null).length;
        let skipped = 0;

        for (const record of sorted) {
            if (record.checkIn !== null && record.checkOut === null) {
                if (skipped < pairedCount) {
                    skipped++;
                    continue;
                }
                currentSession = {
                    id: record.id,
                    checkIn: record.checkIn,
                    checkOut: null,
                    location: record.location,
                    latitude: record.latitude ?? null,
                    longitude: record.longitude ?? null,
                };
                break;
            }
        }
    }

    return { isCheckedIn, currentSession, sessions };
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchTodayStatus = createAsyncThunk<
    TodayAttendanceStatus,
    void,
    { rejectValue: string }
>(
    'attendance/fetchToday',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get<TodayAttendanceStatus>(
                ENDPOINTS.attendance.today,
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(
                extractErrorMessage(error, 'Failed to fetch today status'),
            );
        }
    },
);

export const logAttendance = createAsyncThunk<
    AttendanceSession,
    LogAttendancePayload,
    { state: RootState; rejectValue: AttendanceError }
>(
    'attendance/log',
    async (payload, { getState, rejectWithValue }) => {
        const mrId = getState().profile.data?.id;
        if (!mrId) {
            return rejectWithValue({ message: 'Profile not loaded. Please try again.' });
        }

        const now = dayjs();
        const time = now.format('HH:mm');

        try {
            const response = await apiClient.post<AttendanceSession>(
                ENDPOINTS.attendance.log,
                {
                    mrId,
                    date: now.format('YYYY-MM-DD'),
                    status: 'Present',
                    checkIn: payload.action === 'check-in' ? time : null,
                    checkOut: payload.action === 'check-out' ? time : null,
                    location: payload.location,
                },
            );
            return response.data;
        } catch (error) {
            return rejectWithValue({
                message: extractErrorMessage(error, `Failed to ${payload.action}`),
                status: extractErrorStatus(error),
            });
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: AttendanceState = {
    checkInLoading: false,
    checkOutLoading: false,
    todayLoading: false,
    isCheckedIn: false,
    currentSession: null,
    sessions: [],
    error: null,
};

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        clearAttendanceError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // ── fetchTodayStatus ──────────────────────────────────────────────
            .addCase(fetchTodayStatus.pending, (state) => {
                state.todayLoading = true;
                state.error = null;
            })
            .addCase(fetchTodayStatus.fulfilled, (state, action) => {
                state.todayLoading = false;
                // Derive state from raw records — never trust the API's isCheckedIn flag.
                const derived = deriveFromRecords(action.payload.sessions);
                state.isCheckedIn = derived.isCheckedIn;
                state.currentSession = derived.currentSession;
                state.sessions = derived.sessions;
            })
            .addCase(fetchTodayStatus.rejected, (state) => {
                state.todayLoading = false;
                // Non-critical: don't surface to user, just default to not checked in
                state.error = null;
            })
            // ── logAttendance ─────────────────────────────────────────────────
            .addCase(logAttendance.pending, (state, action) => {
                state.error = null;
                if (action.meta.arg.action === 'check-in') {
                    state.checkInLoading = true;
                } else {
                    state.checkOutLoading = true;
                }
            })
            .addCase(logAttendance.fulfilled, (state, action) => {
                const raw = action.payload;
                if (action.meta.arg.action === 'check-in') {
                    state.checkInLoading = false;
                    state.isCheckedIn = true;
                    state.currentSession = raw;
                    // Optimistically append a new active session
                    state.sessions.push({
                        checkIn: formatSessionTime(raw.checkIn),
                        checkOut: null,
                        isActive: true,
                    });
                } else {
                    state.checkOutLoading = false;
                    state.isCheckedIn = false;
                    state.currentSession = null;
                    // Close the most recent active session
                    const active = [...state.sessions]
                        .reverse()
                        .find((s) => s.isActive);
                    if (active) {
                        active.checkOut = formatSessionTime(raw.checkOut);
                        active.isActive = false;
                    }
                }
            })
            .addCase(logAttendance.rejected, (state, action) => {
                state.checkInLoading = false;
                state.checkOutLoading = false;
                state.error = action.payload?.message ?? 'Attendance log failed';
            });
    },
});

export const { clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
