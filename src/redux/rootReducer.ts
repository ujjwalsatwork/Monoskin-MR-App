import { combineReducers, AnyAction } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import visitReducer from './slices/visitSlice';
import visitSessionReducer from './slices/visitSessionSlice';
import attendanceReducer from './slices/attendanceSlice';
import portfolioReducer from './slices/portfolioSlice';
import profileReducer from './slices/profileSlice';
import routeReducer from './slices/routeSlice';
import leaveReducer from './slices/leaveSlice';
import leadDraftReducer from './slices/leadDraftSlice';

const appReducer = combineReducers({
    auth: authReducer,
    user: userReducer,
    visits: visitReducer,
    visitSession: visitSessionReducer,
    attendance: attendanceReducer,
    portfolio: portfolioReducer,
    profile: profileReducer,
    route: routeReducer,
    leave: leaveReducer,
    leadDrafts: leadDraftReducer,
});

// Reset all slices to initialState on logout so stale data never leaks between sessions.
//
// `leadDrafts` resets in memory here like everything else, but its AsyncStorage
// records are deliberately NOT cleared on logout — an expired session is exactly
// when an MR has unsent work, and wiping it would destroy the data the queue
// exists to protect. The drafts come back on the next hydrate for that same MR,
// and the stored `mrId` keeps them invisible to anyone else on a shared handset.
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
    if (action.type === 'auth/logout') {
        return appReducer(undefined, action);
    }
    return appReducer(state, action);
};

export type RootState = ReturnType<typeof appReducer>;
export default rootReducer;
