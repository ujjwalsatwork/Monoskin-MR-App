import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VisitRecord {
    id: number;
    routeStopId?: number;
    doctorId?: number;
    pharmacyId?: number;
    status?: string;
}

interface VisitState {
    creating: boolean;
    lastCreated: VisitRecord | null;
    error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const extractErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    if (axiosError.response?.status === 409) {
        return 'This stop is already marked as visited';
    }
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        fallback
    );
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const startVisit = createAsyncThunk<
    VisitRecord,
    {
        routeStopId: number;
        doctorId?: number;
        pharmacyId?: number;
        leadId?: number;
        notes?: string;
        samplesGiven?: boolean;
    },
    { rejectValue: string }
>(
    'visits/start',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.post<VisitRecord>(
                ENDPOINTS.mrVisits.create,
                {
                    ...payload,
                    visitType: 'Lead Visit',
                    outcome: 'Follow-up Required',
                },
            );
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to start visit'));
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: VisitState = {
    creating: false,
    lastCreated: null,
    error: null,
};

const visitSlice = createSlice({
    name: 'visits',
    initialState,
    reducers: {
        clearVisitError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(startVisit.pending, (state) => {
                state.creating = true;
                state.error = null;
            })
            .addCase(startVisit.fulfilled, (state, action) => {
                state.creating = false;
                state.lastCreated = action.payload;
            })
            .addCase(startVisit.rejected, (state, action) => {
                state.creating = false;
                state.error = action.payload ?? 'Failed to start visit';
            });
    },
});

export const { clearVisitError } = visitSlice.actions;
export default visitSlice.reducer;
