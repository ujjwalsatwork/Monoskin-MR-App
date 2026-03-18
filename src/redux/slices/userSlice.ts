import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserInfo {
    id: string;
    name: string;
    email: string;
    role: string;
}

interface UserState {
    info: UserInfo | null;
}

const initialState: UserState = {
    info: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserInfo: (state, action: PayloadAction<UserInfo>) => {
            state.info = action.payload;
        },
        clearUserInfo: (state) => {
            state.info = null;
        },
    },
});

export const { setUserInfo, clearUserInfo } = userSlice.actions;
export default userSlice.reducer;
