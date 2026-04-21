import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import visitReducer from './slices/visitSlice';
import attendanceReducer from './slices/attendanceSlice';
import portfolioReducer from './slices/portfolioSlice';
import profileReducer from './slices/profileSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    user: userReducer,
    visits: visitReducer,
    attendance: attendanceReducer,
    portfolio: portfolioReducer,
    profile: profileReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
