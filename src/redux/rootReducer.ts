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
});

// Reset all slices to initialState on logout so stale data never leaks between sessions
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
    if (action.type === 'auth/logout') {
        return appReducer(undefined, action);
    }
    return appReducer(state, action);
};

export type RootState = ReturnType<typeof appReducer>;
export default rootReducer;
