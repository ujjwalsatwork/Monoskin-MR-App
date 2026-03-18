import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as loginAction, logout as logoutAction, setLoading } from '@/redux/slices/authSlice';
import { setUserInfo, clearUserInfo } from '@/redux/slices/userSlice';
import { useCallback } from 'react';

const TOKEN_KEY = '@auth_token';

export const useAuth = () => {
    const dispatch = useDispatch();

    const checkAuth = useCallback(async () => {
        try {
            dispatch(setLoading(true));
            const token = await AsyncStorage.getItem(TOKEN_KEY);
            if (token) {
                // dummy check
                dispatch(loginAction(token));
                dispatch(setUserInfo({
                    id: '1',
                    name: 'John MR',
                    email: 'john@example.com',
                    role: 'Medical Rep'
                }));
            }
        } catch (e) {
            console.error('Failed to load token', e);
        } finally {
            dispatch(setLoading(false));
        }
    }, [dispatch]);

    const login = async (email: string, _pass: string) => {
        // Dummy login logic
        const dummyToken = 'dummy-jwt-token-for-' + email;
        await AsyncStorage.setItem(TOKEN_KEY, dummyToken);
        dispatch(loginAction(dummyToken));
        dispatch(setUserInfo({
            id: '1',
            name: 'John MR',
            email: email,
            role: 'Medical Rep'
        }));
    };

    const logout = async () => {
        await AsyncStorage.removeItem(TOKEN_KEY);
        dispatch(logoutAction());
        dispatch(clearUserInfo());
    };

    return { login, logout, checkAuth };
};
