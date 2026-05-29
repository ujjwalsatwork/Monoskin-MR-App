import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── API shapes ───────────────────────────────────────────────────────────────

interface ApiRouteStop {
    id: number;
    routeId: number;
    sequence: number;
    doctorId?: number | null;
    pharmacyId?: number | null;
    leadId?: number | null;
    scheduledTime?: string | null;
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    status: string;
    visitId?: number | null;
    notes?: string | null;
    duration?: number | null;
}

interface ApiRouteResponse {
    date: string;
    isToday: boolean;
    mrId: number;
    readOnly: boolean;
    origin: {
        latitude?: number | null;
        longitude?: number | null;
        label?: string | null;
    };
    stops: ApiRouteStop[];
}

// ─── UI shapes ────────────────────────────────────────────────────────────────

export interface RouteStop {
    id: number;
    doctorId?: number;
    pharmacyId?: number;
    leadId?: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
    sequence: number;
    plannedTime: string;
    status: 'DONE' | 'TARGET' | 'UPCOMING';
    isActionAllowed: boolean;
    distanceStr?: string;
    timeStr?: string;
    phone?: string;
    visitId?: number;
    duration?: number;
}

export interface RouteData {
    date: string;
    isToday: boolean;
    readOnly: boolean;
    mrId: number;
    origin: { lat: number; lng: number };
    summary: {
        totalDoctors: number;
        totalChemists: number;
        totalLeads: number;
        completed: number;
        total: number;
    };
    stops: RouteStop[];
}

// ─── State ────────────────────────────────────────────────────────────────────

interface TodaySubState {
    data: RouteData | null;
    loading: boolean;
    error: string | null;
}

interface RouteState {
    selectedDate: string;
    data: RouteData | null;
    loading: boolean;
    error: string | null;
    needsRefresh: boolean;
    today: TodaySubState;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayString = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const extractErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        fallback
    );
};

const mapApiResponse = (api: ApiRouteResponse): RouteData => {
    let targetAssigned = false;

    const stops: RouteStop[] = api.stops.map(s => {
        const isDone =
            s.status === 'Visited' ||
            s.status === 'Done' ||
            s.status === 'Completed' ||
            s.visitId != null;

        let status: 'DONE' | 'TARGET' | 'UPCOMING';
        let isActionAllowed = false;

        if (isDone) {
            status = 'DONE';
        } else if (!targetAssigned) {
            targetAssigned = true;
            status = 'TARGET';
            isActionAllowed = !api.readOnly;
        } else {
            status = 'UPCOMING';
        }

        return {
            id: s.id,
            doctorId: s.doctorId ?? undefined,
            pharmacyId: s.pharmacyId ?? undefined,
            leadId: s.leadId ?? undefined,
            name: s.name,
            address: s.address ?? '',
            lat: s.latitude ?? 0,
            lng: s.longitude ?? 0,
            sequence: s.sequence,
            plannedTime: s.scheduledTime ?? '',
            status,
            isActionAllowed,
            visitId: s.visitId ?? undefined,
            duration: s.duration ?? undefined,
        };
    });

    const completed = stops.filter(s => s.status === 'DONE').length;
    const totalDoctors = api.stops.filter(s => s.doctorId != null).length;
    const totalChemists = api.stops.filter(s => s.pharmacyId != null).length;
    const totalLeads = api.stops.filter(s => s.leadId != null).length;

    return {
        date: api.date,
        isToday: api.isToday,
        readOnly: api.readOnly,
        mrId: api.mrId,
        origin: {
            lat: api.origin?.latitude ?? 0,
            lng: api.origin?.longitude ?? 0,
        },
        summary: {
            totalDoctors,
            totalChemists,
            totalLeads,
            completed,
            total: stops.length,
        },
        stops,
    };
};

// ─── Geocoding ────────────────────────────────────────────────────────────────

const geocodeAddress = async (
    address: string,
): Promise<{ lat: number; lng: number } | null> => {
    if (!address.trim()) return null;
    try {
        const encoded = encodeURIComponent(address);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
            { headers: { 'Accept-Language': 'en' } },
        );
        const json: Array<{ lat: string; lon: string }> = await res.json();
        if (json?.[0]) {
            return { lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) };
        }
        return null;
    } catch {
        return null;
    }
};

// Geocodes stops whose lat/lng are missing (null → 0) using their address.
// Requests are staggered to respect Nominatim's 1 req/sec policy.
const geocodeStops = async (stops: RouteStop[]): Promise<RouteStop[]> => {
    const result: RouteStop[] = [];
    for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        if (stop.lat === 0 && stop.lng === 0 && stop.address) {
            if (i > 0) {
                await new Promise(r => setTimeout(r, 300));
            }
            const coords = await geocodeAddress(stop.address);
            result.push(coords ? { ...stop, lat: coords.lat, lng: coords.lng } : stop);
        } else {
            result.push(stop);
        }
    }
    return result;
};

const enrichWithCoords = async (data: RouteData): Promise<RouteData> => {
    const stops = await geocodeStops(data.stops);

    // If origin has no coords, fall back to the first stop that has valid coords
    let origin = data.origin;
    if (origin.lat === 0 && origin.lng === 0) {
        const first = stops.find(s => s.lat !== 0 || s.lng !== 0);
        if (first) origin = { lat: first.lat, lng: first.lng };
    }

    return { ...data, stops, origin };
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchRoute = createAsyncThunk<
    RouteData | null,
    { date: string },
    { rejectValue: string }
>(
    'route/fetch',
    async ({ date }, { rejectWithValue }) => {
        try {
            const response = await apiClient.get<ApiRouteResponse>(
                ENDPOINTS.mrRoutes.list,
                { params: { date } },
            );
            const mapped = mapApiResponse(response.data);
            return await enrichWithCoords(mapped);
        } catch (error) {
            const axiosError = error as AxiosError<{ error?: string; message?: string }>;
            if (axiosError.response?.status === 404) {
                return null;
            }
            return rejectWithValue(extractErrorMessage(error, 'Failed to load route'));
        }
    },
);

export const fetchTodayRoute = createAsyncThunk<
    RouteData,
    void,
    { rejectValue: string }
>(
    'route/fetchToday',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.get<ApiRouteResponse>(
                ENDPOINTS.mrRoutes.list,
                { params: { date: todayString() } },
            );
            const mapped = mapApiResponse(response.data);
            return await enrichWithCoords(mapped);
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to load today route'));
        }
    },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const initialState: RouteState = {
    selectedDate: todayString(),
    data: null,
    loading: false,
    error: null,
    needsRefresh: false,
    today: {
        data: null,
        loading: false,
        error: null,
    },
};

const routeSlice = createSlice({
    name: 'route',
    initialState,
    reducers: {
        setSelectedDate: (state, action: PayloadAction<string>) => {
            state.selectedDate = action.payload;
            state.data = null;
            state.error = null;
        },
        clearRouteError: (state) => {
            state.error = null;
        },
        setRouteNeedsRefresh: (state, action: PayloadAction<boolean>) => {
            state.needsRefresh = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchRoute.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchRoute.fulfilled, (state, action) => {
                state.loading = false;
                state.data = action.payload ?? null;
                state.error = null;
            })
            .addCase(fetchRoute.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload ?? 'Failed to load route';
            })
            .addCase(fetchTodayRoute.pending, (state) => {
                state.today.loading = true;
                state.today.error = null;
            })
            .addCase(fetchTodayRoute.fulfilled, (state, action) => {
                state.today.loading = false;
                state.today.data = action.payload;
            })
            .addCase(fetchTodayRoute.rejected, (state, action) => {
                state.today.loading = false;
                state.today.error = action.payload ?? 'Failed to load today route';
            });
    },
});

export const { setSelectedDate, clearRouteError, setRouteNeedsRefresh } = routeSlice.actions;
export default routeSlice.reducer;
