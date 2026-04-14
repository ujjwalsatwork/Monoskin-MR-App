import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '@/redux/store';
import { logout } from '@/redux/slices/authSlice';

const BASE_URL = 'https://monoskin-development.ment.tech/api';

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const token = store.getState().auth.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        const sessionCookie = await AsyncStorage.getItem('session_cookie');
        if (sessionCookie) {
            config.headers.Cookie = sessionCookie;
        }
        return config;
    },
    (error: AxiosError) => Promise.reject(error),
);

apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            store.dispatch(logout());
        }
        return Promise.reject(error);
    },
);

export default apiClient;
