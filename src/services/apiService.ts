import { AxiosError } from 'axios';
import apiClient from './apiClient';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiCallOptions {
    method: HttpMethod;
    endpoint: string;
    data?: Record<string, unknown>;
    params?: Record<string, unknown>;
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    success: boolean;
}

export interface ApiError {
    message: string;
    statusCode?: number;
}

export const apiCall = async <T>(
    options: ApiCallOptions,
): Promise<ApiResponse<T>> => {
    const { method, endpoint, data, params } = options;
    try {
        const response = await apiClient.request<ApiResponse<T>>({
            method,
            url: endpoint,
            data,
            params,
        });
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<ApiError>;
        const message =
            axiosError.response?.data?.message ??
            axiosError.message ??
            'Something went wrong. Please try again.';
        const statusCode = axiosError.response?.status;
        throw { message, statusCode } as ApiError;
    }
};
