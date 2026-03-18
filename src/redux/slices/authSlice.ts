import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const initialState: AuthState = {
    token: null,
    isAuthenticated: false,
    isLoading: true,
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
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        },
    },
});

export const { setLoading, login, logout } = authSlice.actions;
export default authSlice.reducer;
