import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    OngoingVisit,
    VisitTargetType,
    clearVisitSession,
    readVisitSession,
    touchVisitSession,
    writeVisitSession,
} from '@/services/visitSessionStorage';

// ─────────────────────────────────────────────────────────────────────────────
// The single source of truth for "is a visit running, and which one".
//
// Redux is the synchronous read path — every button's enabled state, the timer
// and the resume banner select from here. AsyncStorage is only its
// crash-survivable shadow; nothing in a render path ever awaits it.
// ─────────────────────────────────────────────────────────────────────────────

interface VisitSessionState {
    /** False until the boot-time AsyncStorage read completes. Gates the nav guard. */
    hydrated: boolean;
    /**
     * Which owner id the last read was performed for — `undefined` means never.
     *
     * A plain `hydrated` boolean is not enough: an auth 401 resets this slice and
     * re-hydration then runs with no logged-in user, which resolves to a null
     * owner. Keying on the identity makes the read re-run once the MR logs back
     * in, instead of staying "already hydrated" against the wrong identity.
     */
    hydratedFor: number | null | undefined;
    /**
     * Set when a read restored a session, consumed by the navigator to route the
     * MR into it. Only hydration raises this, so starting a visit normally (which
     * navigates itself) can never trigger a second, competing navigation.
     */
    pendingRestoreNav: boolean;
    active: OngoingVisit | null;
}

const initialState: VisitSessionState = {
    hydrated: false,
    hydratedFor: undefined,
    pendingRestoreNav: false,
    active: null,
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

/**
 * The ONE identity a session is stamped with and validated against.
 *
 * Must be `auth.user.id` and nothing else: it is set by `checkSession()` on every
 * cold boot and by `verifyOtp()` on login, so it is always available. Mixing in
 * `profile.data.id` breaks cold-start restore — `profile` is only populated once
 * a screen dispatches `fetchMyProfile()`, so a session written with the profile
 * id would be read back against the auth id and rejected as another MR's.
 */
export const selectSessionOwnerId = (state: any): number | null =>
    state?.auth?.user?.id ?? null;

/**
 * Boot-time restore. Must run *after* `checkSession()` resolves so the owner id
 * is known — a session is validated against its owner before being restored.
 */
export const hydrateVisitSession = createAsyncThunk<
    { session: OngoingVisit | null; ownerId: number | null },
    void,
    { state: any }
>(
    'visitSession/hydrate',
    async (_, { getState }) => {
        const ownerId = selectSessionOwnerId(getState());
        return { session: await readVisitSession(ownerId), ownerId };
    },
);

/** Persist and activate a new session. The anchor is set by the caller, at tap time. */
export const startVisitSession = createAsyncThunk<OngoingVisit, OngoingVisit>(
    'visitSession/start',
    async (session) => {
        await writeVisitSession(session);
        return session;
    },
);

/** Ends the session — used by cancel, by a successful submit, and by logout. */
export const endVisitSession = createAsyncThunk<void, void>(
    'visitSession/end',
    async () => {
        await clearVisitSession();
    },
);

export const heartbeatVisitSession = createAsyncThunk<number | null, void, { state: any }>(
    'visitSession/heartbeat',
    async (_, { getState }) => {
        const session: OngoingVisit | null = getState()?.visitSession?.active ?? null;
        if (!session) { return null; }
        const now = Date.now();
        await touchVisitSession(session);
        return now;
    },
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const visitSessionSlice = createSlice({
    name: 'visitSession',
    initialState,
    reducers: {
        // Synchronous activation so mutual exclusion is airtight the instant the
        // MR confirms — no async window in which a second visit could start.
        sessionStarted: (state, action: PayloadAction<OngoingVisit>) => {
            state.active = action.payload;
        },
        sessionCleared: (state) => {
            state.active = null;
            state.pendingRestoreNav = false;
        },
        restoreNavConsumed: (state) => {
            state.pendingRestoreNav = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateVisitSession.fulfilled, (state, action) => {
                state.hydrated = true;
                state.hydratedFor = action.payload.ownerId;
                state.active = action.payload.session;
                state.pendingRestoreNav = action.payload.session !== null;
            })
            .addCase(hydrateVisitSession.rejected, (state) => {
                // Never let a storage failure hang the splash screen.
                state.hydrated = true;
                state.hydratedFor = null;
                state.active = null;
            })
            .addCase(startVisitSession.fulfilled, (state, action) => {
                state.active = action.payload;
            })
            .addCase(endVisitSession.fulfilled, (state) => {
                state.active = null;
            })
            .addCase(heartbeatVisitSession.fulfilled, (state, action) => {
                if (state.active && action.payload) {
                    state.active.lastSeenAt = action.payload;
                }
            });
    },
});

export const { sessionStarted, sessionCleared, restoreNavConsumed } =
    visitSessionSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────
// The whole app talks to these, never to the raw slice.

export const selectActiveSession = (state: any): OngoingVisit | null =>
    state.visitSession.active;

export const selectSessionHydrated = (state: any): boolean =>
    state.visitSession.hydrated;

export const selectSessionHydratedFor = (state: any): number | null | undefined =>
    state.visitSession.hydratedFor;

export const selectPendingRestoreNav = (state: any): boolean =>
    state.visitSession.pendingRestoreNav;

export const selectIsVisitActive = (state: any): boolean =>
    state.visitSession.active !== null;

export const selectIsTargetActive =
    (visitType: VisitTargetType, targetId: string | number) =>
        (state: any): boolean => {
            const active: OngoingVisit | null = state.visitSession.active;
            return (
                !!active &&
                active.visitType === visitType &&
                active.targetId === String(targetId)
            );
        };

export default visitSessionSlice.reducer;
