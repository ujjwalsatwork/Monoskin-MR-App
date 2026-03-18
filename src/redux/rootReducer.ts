import { combineReducers } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import visitReducer from './slices/visitSlice';

const rootReducer = combineReducers({
    auth: authReducer,
    user: userReducer,
    visits: visitReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;
