import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    LeadDraft,
    clearLeadDraftsForOwner,
    readLeadDrafts,
    removeLeadDraft,
    upsertLeadDraft,
} from '@/services/leadDraftStorage';
import { FlushSummary, flushLeadDrafts, retryLeadDraftNow } from '@/services/leadDraftSync';

// ─────────────────────────────────────────────────────────────────────────────
// The synchronous read path for unsent leads.
//
// Same division of labour as `visitSessionSlice`: Redux is what every render
// selects from, AsyncStorage is only its crash-survivable shadow. Nothing in a
// render path ever awaits storage.
// ─────────────────────────────────────────────────────────────────────────────

interface LeadDraftState {
    /** False until the boot-time read completes. */
    hydrated: boolean;
    /**
     * Which owner id the last read ran for — `undefined` means never.
     *
     * A plain `hydrated` boolean is not enough: an auth 401 resets this slice, and
     * re-hydration would then run with no logged-in user and resolve to a null
     * owner. Keying on the identity makes the read re-run once the MR signs back
     * in, instead of staying "already hydrated" against the wrong identity.
     */
    hydratedFor: number | null | undefined;
    drafts: LeadDraft[];
    /** True while a flush pass is running. */
    syncing: boolean;
    /**
     * Result of the most recent flush that actually did something, so the Leads
     * screen can confirm "2 leads submitted" instead of the count silently
     * dropping to zero while the MR was looking elsewhere.
     */
    lastSyncSummary: (FlushSummary & { at: number }) | null;
}

const initialState: LeadDraftState = {
    hydrated: false,
    hydratedFor: undefined,
    drafts: [],
    syncing: false,
    lastSyncSummary: null,
};

/**
 * The ONE identity a draft is stamped with and validated against.
 *
 * Must be `auth.user.id` for the same reason the visit session uses it: it is set
 * by `checkSession()` on every cold boot and by `verifyOtp()` on login, so it is
 * always available. `profile.data.id` is only populated once a screen fetches the
 * profile, so a draft written with it would be read back against the auth id and
 * rejected as another MR's.
 */
export const selectDraftOwnerId = (state: any): number | null =>
    state?.auth?.user?.id ?? null;

// ─── Thunks ──────────────────────────────────────────────────────────────────

/** Boot-time restore. Must run after `checkSession()` so the owner id is known. */
export const hydrateLeadDrafts = createAsyncThunk<
    { drafts: LeadDraft[]; ownerId: number | null },
    void,
    { state: any }
>(
    'leadDrafts/hydrate',
    async (_, { getState }) => {
        const ownerId = selectDraftOwnerId(getState());
        return { drafts: await readLeadDrafts(ownerId), ownerId };
    },
);

/** Persist a submission the network could not deliver. */
export const saveLeadDraft = createAsyncThunk<LeadDraft[], LeadDraft, { state: any }>(
    'leadDrafts/save',
    async (draft, { getState }) => {
        await upsertLeadDraft(draft);
        return readLeadDrafts(selectDraftOwnerId(getState()));
    },
);

/** MR chose to throw one away. */
export const discardLeadDraft = createAsyncThunk<LeadDraft[], string, { state: any }>(
    'leadDrafts/discard',
    async (draftId, { getState }) => {
        await removeLeadDraft(draftId);
        return readLeadDrafts(selectDraftOwnerId(getState()));
    },
);

/** MR chose to throw all of theirs away. */
export const discardAllLeadDrafts = createAsyncThunk<LeadDraft[], void, { state: any }>(
    'leadDrafts/discardAll',
    async (_, { getState }) => {
        const ownerId = selectDraftOwnerId(getState());
        if (ownerId != null) { await clearLeadDraftsForOwner(ownerId); }
        return readLeadDrafts(ownerId);
    },
);

/**
 * Drain the queue.
 *
 * The transport module holds its own single-flight guard, so a duplicate dispatch
 * joins the running pass rather than starting a second one.
 */
export const syncLeadDrafts = createAsyncThunk<
    { summary: FlushSummary; drafts: LeadDraft[] },
    void,
    { state: any }
>(
    'leadDrafts/sync',
    async (_, { getState }) => {
        const ownerId = selectDraftOwnerId(getState());
        const summary = await flushLeadDrafts(ownerId);
        return { summary, drafts: await readLeadDrafts(ownerId) };
    },
);

/** MR tapped Retry on one draft — bypasses its backoff window. */
export const retryLeadDraft = createAsyncThunk<
    { summary: FlushSummary; drafts: LeadDraft[] },
    string,
    { state: any }
>(
    'leadDrafts/retry',
    async (draftId, { getState }) => {
        const ownerId = selectDraftOwnerId(getState());
        const summary = await retryLeadDraftNow(draftId, ownerId);
        return { summary, drafts: await readLeadDrafts(ownerId) };
    },
);

// ─── Slice ───────────────────────────────────────────────────────────────────

const leadDraftSlice = createSlice({
    name: 'leadDrafts',
    initialState,
    reducers: {
        /** Consumed by the Leads screen once it has shown the confirmation. */
        syncSummaryConsumed: (state) => {
            state.lastSyncSummary = null;
        },
        draftsReplaced: (state, action: PayloadAction<LeadDraft[]>) => {
            state.drafts = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateLeadDrafts.fulfilled, (state, action) => {
                state.hydrated = true;
                state.hydratedFor = action.payload.ownerId;
                state.drafts = action.payload.drafts;
            })
            .addCase(hydrateLeadDrafts.rejected, (state) => {
                // Mark hydrated anyway: a storage failure must not wedge the app in a
                // permanent "still loading drafts" state.
                state.hydrated = true;
            })
            .addCase(saveLeadDraft.fulfilled, (state, action) => {
                state.drafts = action.payload;
            })
            .addCase(discardLeadDraft.fulfilled, (state, action) => {
                state.drafts = action.payload;
            })
            .addCase(discardAllLeadDrafts.fulfilled, (state, action) => {
                state.drafts = action.payload;
            })
            .addCase(syncLeadDrafts.pending, (state) => {
                state.syncing = true;
            })
            .addCase(syncLeadDrafts.fulfilled, (state, action) => {
                state.syncing = false;
                state.drafts = action.payload.drafts;
                const { submitted, failed } = action.payload.summary;
                // Only surface a summary the MR would care about.
                if (submitted > 0 || failed > 0) {
                    state.lastSyncSummary = { ...action.payload.summary, at: Date.now() };
                }
            })
            .addCase(syncLeadDrafts.rejected, (state) => {
                state.syncing = false;
            })
            .addCase(retryLeadDraft.pending, (state) => {
                state.syncing = true;
            })
            .addCase(retryLeadDraft.fulfilled, (state, action) => {
                state.syncing = false;
                state.drafts = action.payload.drafts;
                const { submitted, failed } = action.payload.summary;
                if (submitted > 0 || failed > 0) {
                    state.lastSyncSummary = { ...action.payload.summary, at: Date.now() };
                }
            })
            .addCase(retryLeadDraft.rejected, (state) => {
                state.syncing = false;
            });
    },
});

export const { syncSummaryConsumed, draftsReplaced } = leadDraftSlice.actions;

// ─── Selectors ───────────────────────────────────────────────────────────────

export const selectLeadDrafts = (state: any): LeadDraft[] => state?.leadDrafts?.drafts ?? [];
export const selectDraftsHydratedFor = (state: any): number | null | undefined =>
    state?.leadDrafts?.hydratedFor;
export const selectDraftsSyncing = (state: any): boolean => !!state?.leadDrafts?.syncing;
export const selectLastSyncSummary = (state: any) => state?.leadDrafts?.lastSyncSummary ?? null;

/** Queued and still expected to succeed on their own. */
export const selectPendingDraftCount = (state: any): number =>
    selectLeadDrafts(state).filter(d => d.status !== 'failed').length;

/** Terminal — these need the MR to intervene. */
export const selectFailedDraftCount = (state: any): number =>
    selectLeadDrafts(state).filter(d => d.status === 'failed').length;

export default leadDraftSlice.reducer;
