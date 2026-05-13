import { useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { AppDispatch } from '@/redux/store';
import { checkSession, logout as logoutAction } from '@/redux/slices/authSlice';

export const useAuth = () => {
    const dispatch = useDispatch<AppDispatch>();

    const checkAuth = useCallback(async () => {
        await dispatch(checkSession());
    }, [dispatch]);

    const logout = useCallback(async () => {
        dispatch(logoutAction());
    }, [dispatch]);

    return { checkAuth, logout };
};
