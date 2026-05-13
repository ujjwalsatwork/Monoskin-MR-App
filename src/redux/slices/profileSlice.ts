import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

export interface MRProfile {
    id: number;
    name: string;
    email: string;
    employeeId: string;
    phone: string;
    territory: string;
    region: string;
    managerRole: string;
    reportingManager: string;
    profilePhoto: string | null;
    leadsAssigned: number;
    conversions: number;
}

export interface UpdateProfilePayload {
    phone?: string;
    territory?: string;
    region?: string;
    profilePhoto?: string | null;
}

interface ProfileState {
    data: MRProfile | null;
    isLoading: boolean;
    isUpdating: boolean;
    error: string | null;
    updateError: string | null;
}

const initialState: ProfileState = {
    data: null,
    isLoading: false,
    isUpdating: false,
    error: null,
    updateError: null,
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        fallback
    );
};

export const fetchMyProfile = createAsyncThunk<MRProfile>(
    'profile/fetchMyProfile',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<MRProfile>({
                method: 'GET',
                url: ENDPOINTS.profile.me,
            });
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to fetch profile'));
        }
    },
);

export const updateMyProfile = createAsyncThunk<MRProfile, FormData>(
    'profile/updateMyProfile',
    async (formData, { rejectWithValue }) => {
        try {
            console.log('📤 Update Profile Payload:', formData.getParts());
            const response = await apiClient.request<MRProfile>({
                method: 'PATCH',
                url: ENDPOINTS.profile.me,
                data: formData,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            console.log('🚀 ~ response:', response)
            return response.data;
        } catch (error) {
        console.log('🚀 ~ error:', error)

            return rejectWithValue(extractErrorMessage(error, 'Failed to update profile'));
        }
    },
);

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        clearProfile: (state) => {
            state.data = null;
            state.error = null;
        },
        clearUpdateError: (state) => {
            state.updateError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyProfile.fulfilled, (state, action) => {
                state.isLoading = false;
                state.data = action.payload;
            })
            .addCase(fetchMyProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = (action.payload as string) ?? 'Failed to fetch profile';
            })
            .addCase(updateMyProfile.pending, (state) => {
                state.isUpdating = true;
                state.updateError = null;
            })
            .addCase(updateMyProfile.fulfilled, (state, action) => {
                state.isUpdating = false;
                state.data = action.payload;
            })
            .addCase(updateMyProfile.rejected, (state, action) => {
                state.isUpdating = false;
                state.updateError = (action.payload as string) ?? 'Failed to update profile';
            });
    },
});

export const { clearProfile, clearUpdateError } = profileSlice.actions;
export default profileSlice.reducer;
