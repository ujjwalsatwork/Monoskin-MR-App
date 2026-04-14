import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import dayjs from 'dayjs';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { RootState } from '@/redux/store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LogAttendancePayload {
    type: 'checkIn' | 'checkOut';
    location: string;
}

interface AttendanceRecord {
    id: number;
    mrId: number;
    date: string;
    status: string;
    checkIn: string | null;
    checkOut: string | null;
    location: string;
}

interface AttendanceState {
    checkInLoading: boolean;
    checkOutLoading: boolean;
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

// ─── Async Thunk ──────────────────────────────────────────────────────────────

export const logAttendance = createAsyncThunk<
    AttendanceRecord,
    LogAttendancePayload,
    { state: RootState }
>(
    'attendance/log',
    async (payload, { getState, rejectWithValue }) => {
        const user = getState().auth.user;
        if (!user) {
            return rejectWithValue('User not authenticated');
        }
        const now = dayjs();
        const time = now.format('HH:mm');
        try {
            const response = await apiClient.request<AttendanceRecord>({
                method: 'POST',
                url: ENDPOINTS.attendance.log,
                data: {
                    mrId: user.id,
                    date: now.format('YYYY-MM-DD'),
                    status: 'Present',
                    checkIn: payload.type === 'checkIn' ? time : null,
                    checkOut: payload.type === 'checkOut' ? time : null,
                    location: payload.location,
                },
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(
                extractErrorMessage(error, `Failed to log ${payload.type}`),
            );
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: AttendanceState = {
    checkInLoading: false,
    checkOutLoading: false,
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
            .addCase(logAttendance.pending, (state, action) => {
                state.error = null;
                if (action.meta.arg.type === 'checkIn') {
                    state.checkInLoading = true;
                } else {
                    state.checkOutLoading = true;
                }
            })
            .addCase(logAttendance.fulfilled, (state, action) => {
                if (action.meta.arg.type === 'checkIn') {
                    state.checkInLoading = false;
                } else {
                    state.checkOutLoading = false;
                }
            })
            .addCase(logAttendance.rejected, (state, action) => {
                state.checkInLoading = false;
                state.checkOutLoading = false;
                state.error = (action.payload as string) ?? 'Attendance log failed';
            });
    },
});

export const { clearAttendanceError } = attendanceSlice.actions;
export default attendanceSlice.reducer;
