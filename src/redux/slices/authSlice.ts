import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SendOtpPayload {
    phone: string;
}

interface SendOtpResponse {
    success: boolean;
    message: string;
    otpFallback?: string;
}

interface VerifyOtpPayload {
    phone: string;
    otp: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    name: string;
    role: string;
    employeeId?: string;
    phone?: string;
    territory?: string;
    region?: string;
    reportingManager?: string;
    managerRole?: string;
    leadsAssigned?: number;
    conversions?: number;
    revenueAttributed?: string;
    status?: string;
    joiningDate?: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    otpLoading: boolean;
    otpSent: boolean;
    otpFallback: string | null;
    verifyLoading: boolean;
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

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const sendOtp = createAsyncThunk<SendOtpResponse, SendOtpPayload>(
    'auth/sendOtp',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<SendOtpResponse>({
                method: 'POST',
                url: ENDPOINTS.auth.sendOtp,
                data: { phone: payload.phone },
            });
            console.log('🚀 ~ response:', response)
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to send OTP'));
        }
    },
);

export const checkSession = createAsyncThunk<User>(
    'auth/checkSession',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<User>({
                method: 'GET',
                url: ENDPOINTS.auth.me,
            });
            console.log('🚀 ~ response:', response)
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Session expired'));
        }
    },
);

export const verifyOtp = createAsyncThunk<User, VerifyOtpPayload>(
    'auth/verifyOtp',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<User>({
                method: 'POST',
                url: ENDPOINTS.auth.verifyOtp,
                data: { phone: payload.phone, otp: payload.otp },
            });
            const setCookieHeader = response.headers['set-cookie'];
            if (setCookieHeader) {
                const rawCookie = Array.isArray(setCookieHeader)
                    ? setCookieHeader[0]
                    : setCookieHeader;
                await AsyncStorage.setItem('session_cookie', rawCookie.split(';')[0]);
            }
            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'OTP verification failed'));
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    otpLoading: false,
    otpSent: false,
    otpFallback: null,
    verifyLoading: false,
    error: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        login: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
            state.isAuthenticated = true;
            state.isLoading = false;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.otpSent = false;
            state.otpFallback = null;
            state.error = null;
            AsyncStorage.removeItem('session_cookie');
        },
        clearAuthError: (state) => {
            state.error = null;
        },
        resetOtpState: (state) => {
            state.otpSent = false;
            state.otpFallback = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // checkSession
            .addCase(checkSession.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(checkSession.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload;
            })
            .addCase(checkSession.rejected, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
            })
            // sendOtp
            .addCase(sendOtp.pending, (state) => {
                state.otpLoading = true;
                state.error = null;
                state.otpSent = false;
                state.otpFallback = null;
            })
            .addCase(sendOtp.fulfilled, (state, action) => {
                state.otpLoading = false;
                state.otpSent = true;
                state.otpFallback = action.payload.otpFallback ?? null;
            })
            .addCase(sendOtp.rejected, (state, action) => {
                state.otpLoading = false;
                state.otpSent = false;
                state.error = (action.payload as string) ?? 'Failed to send OTP';
            })
            // verifyOtp
            .addCase(verifyOtp.pending, (state) => {
                state.verifyLoading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.verifyLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.verifyLoading = false;
                state.error = (action.payload as string) ?? 'OTP verification failed';
            });
    },
});

export const { setLoading, login, logout, clearAuthError, resetOtpState } =
    authSlice.actions;
export default authSlice.reducer;
