import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { RootState } from '@/redux/store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubmitLeavePayload {
    leaveType: string;
    startDate: string;   // YYYY-MM-DD
    endDate: string;     // YYYY-MM-DD
    totalDays: string;
    reason: string;
}

export interface LeaveRequest {
    id: number;
    employeeId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
    status: string;
}

export interface LeaveError {
    message: string;
    status?: number;
}

interface LeaveState {
    submitLoading: boolean;
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

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const submitLeaveRequest = createAsyncThunk<
    LeaveRequest,
    SubmitLeavePayload,
    { state: RootState; rejectValue: LeaveError }
>(
    'leave/submit',
    async (payload, { getState, rejectWithValue }) => {
        const employeeId = getState().profile.data?.id;
        if (!employeeId) {
            return rejectWithValue({ message: 'Profile not loaded. Please try again.' });
        }
        console.log(`🚀 ~ payload`, {
                    employeeId,
                    leaveType: payload.leaveType,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                    totalDays: payload.totalDays,
                    reason: payload.reason,
                    status: 'pending',
                },)

        try {
            const response = await apiClient.post<LeaveRequest>(
                ENDPOINTS.leaveRequests.create,
                {
                    employeeId,
                    leaveType: payload.leaveType,
                    startDate: payload.startDate,
                    endDate: payload.endDate,
                    totalDays: payload.totalDays,
                    reason: payload.reason,
                    status: 'pending',
                },
            );
            return response.data;
        } catch (error) {
            return rejectWithValue({
                message: extractErrorMessage(error, 'Failed to submit leave request.'),
                status: extractErrorStatus(error),
            });
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: LeaveState = {
    submitLoading: false,
    error: null,
};

const leaveSlice = createSlice({
    name: 'leave',
    initialState,
    reducers: {
        clearLeaveError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitLeaveRequest.pending, (state) => {
                state.submitLoading = true;
                state.error = null;
            })
            .addCase(submitLeaveRequest.fulfilled, (state) => {
                state.submitLoading = false;
            })
            .addCase(submitLeaveRequest.rejected, (state, action) => {
                state.submitLoading = false;
                state.error = action.payload?.message ?? 'Failed to submit leave request.';
            });
    },
});

export const { clearLeaveError } = leaveSlice.actions;
export default leaveSlice.reducer;
