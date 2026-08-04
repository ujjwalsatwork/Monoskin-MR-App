import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Config from 'react-native-config';
import { store } from '@/redux/store';
import { logout } from '@/redux/slices/authSlice';

// Base URL comes from the active environment file (.env.production / .env.staging),
// selected automatically per build variant/scheme. Never hardcode a host here.
const BASE_URL = Config.BASE_URL_API;

const apiClient = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    withCredentials: true, // include cookies from the native cookie store
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = store.getState().auth.token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Cookie-session auth is handled by the native cookie store (withCredentials).
        // We intentionally do NOT inject a manual `Cookie` header — doing so overrode
        // the native cookie and was rejected by the server, causing a 401 on first login.
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
