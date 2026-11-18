import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';
import { clearVisitSession } from '@/services/visitSessionStorage';
import { isMedicalRepresentative } from '@/constants/roles';

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

/** Shown when a live session belongs to an account that is not a medical rep. */
export const NON_MR_SESSION_MESSAGE =
    'This account is not a Medical Representative. Access to the MR app has been denied.';

/**
 * Terminate the server session, ignoring the network result.
 *
 * Split out of `performLogout` so the role gate below can end a session without
 * dispatching anything — `checkSession` is itself mid-flight at that point and
 * its own `rejected` case is what clears local state.
 */
const endServerSession = async (): Promise<void> => {
    try {
        await apiClient.post(ENDPOINTS.auth.logout);
    } catch {
        // Best effort. Local state is cleared regardless.
    }
};

export const checkSession = createAsyncThunk<User>(
    'auth/checkSession',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.request<User>({
                method: 'GET',
                url: ENDPOINTS.auth.me,
            });

            // MOB-01 — the role gate now lives on the session-restore path, not
            // only on the screen that first signs an MR in.
            //
            // Before this, a non-MR who dismissed "Access Denied" still held a
            // valid server session in the native cookie store; the next launch
            // asked "am I signed in?", the server said yes, and this thunk
            // admitted them with no role condition. A single force-close was the
            // whole of the bypass.
            //
            // Rejecting here means the app never enters its main navigator for a
            // non-MR role, however that session was obtained — and the session is
            // killed server-side on the way out so the cookie cannot be replayed.
            if (!isMedicalRepresentative(response.data?.role)) {
                console.log('🚀 ~ checkSession ~ non-MR role rejected:', response.data?.role);
                await endServerSession();
                await clearVisitSession();
                return rejectWithValue(NON_MR_SESSION_MESSAGE);
            }

            return response.data;
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Session expired'));
        }
    },
);

// Server-side logout: invalidates the session and clears the native cookie via the
// response's Set-Cookie, so a subsequent reload won't silently re-authenticate.
export const performLogout = createAsyncThunk<void, void>(
    'auth/performLogout',
    async (_, { dispatch }) => {
        try {
            await apiClient.post(ENDPOINTS.auth.logout);
        } catch {
            // Ignore — we clear local auth state regardless of the network result.
        }
        // `auth/logout` resets every Redux slice, but AsyncStorage does not wipe
        // itself — an abandoned visit must not follow the handset to the next MR.
        await clearVisitSession();
        dispatch(logout());
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

            // MOB-01 — reject a non-MR here, inside the thunk, rather than on the
            // screen after the fact.
            //
            // `verifyOtp.fulfilled` flips `isAuthenticated`, which swaps the root
            // navigator to the main app on the very next render. Checking the role
            // in the screen's callback therefore ran AFTER the MR-only UI had
            // already mounted. Failing the thunk means the authenticated state is
            // never entered at all, and the server session is ended on the way out
            // so the cookie left in the native store cannot be replayed on the
            // next launch.
            if (!isMedicalRepresentative(response.data?.role)) {
                console.log('🚀 ~ verifyOtp ~ non-MR role rejected:', response.data?.role);
                await endServerSession();
                return rejectWithValue(NON_MR_SESSION_MESSAGE);
            }

            // The session cookie from the response is stored automatically by the
            // native cookie jar and sent on subsequent requests — no manual handling.
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
