import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AxiosError } from 'axios';
import apiClient from '@/services/apiClient';
import { ENDPOINTS } from '@/constants/endpoints';

// ─── Shared ────────────────────────────────────────────────────────────────────

type Category = 'A' | 'B' | 'C';
type PaymentStatus = 'completed' | 'overdue' | 'pending';

const extractErrorMessage = (error: unknown, fallback: string): string => {
    const axiosError = error as AxiosError<{ error?: string; message?: string }>;
    return (
        axiosError.response?.data?.error ??
        axiosError.response?.data?.message ??
        axiosError.message ??
        fallback
    );
};

// ─── Doctor Types ──────────────────────────────────────────────────────────────

export type ApiDoctor = {
    id: number;
    code: string;
    name: string;
    specialization: string;
    designation: string;
    clinic: string;
    city: string;
    state: string;
    address: string;
    phone: string;
    whatsappNumber: string;
    receptionistName: string;
    receptionistPhone: string;
    email: string;
    gstin: string;
    profilePhoto: string | null;
    clinicImages: string[];
    website: string | null;
    socialLinkedIn: string | null;
    socialFacebook: string | null;
    socialTwitter: string | null;
    socialInstagram: string | null;
    googleMapsUrl: string | null;
    latitude: string;
    longitude: string;
    nearbyChemistName: string;
    nearbyChemistPhone: string;
    nearbyChemistAddress: string;
    pricingSlabId: number;
    creditLimit: string;
    outstanding: string;
    importance: string;
    assignedMRId: number;
    isActive: boolean;
    lastContactedAt: string;
    lastSalesDate: string;
    totalSalesValue: string;
    businessCardUrl: string | null;
    tags: string[];
    tier: number;
    nextVisitNotes: string;
    createdAt: string;
    updatedAt: string;
    preferredProducts?: Array<{ id: number; name: string; totalQuantity: number }>;
    unpreferredProducts?: Array<{ id: number; name: string }>;
    interactionHistory?: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
    pharmacyNetwork?: Array<{ id: number; name: string; type: 'primary' | 'linked' }>;
    nearbyPharmacies?: Array<{ id: number; name: string; distance: number }>;
    lastVisitDate?: string | null;
    visitCount?: number;
    pendingFollowUps?: number;
    followUpToday?: number;
    totalVisitsThisMonth?: number;
    weeklyTarget?: number;
    monthlyTarget?: number;
    monthlyAchieved?: number;
    paymentStatus?: string;
};

export type Doctor = {
    id: string;
    name: string;
    specialty: string;
    hospital: string;
    address: string;
    city: string;
    state: string;
    category: Category;
    priority?: string;
    followUpToday: boolean;
    tags: string[];
    weeklyTarget: number;
    visitCount: number;
    amount: string;
    paymentStatus: PaymentStatus;
    lastVisit: string;
    lastVisitOverdue: boolean;
    achievement: { done: number; total: number };
};

const mapApiDoctorToUI = (d: ApiDoctor): Doctor => {
    let category: Category = 'C';
    if (d.tier === 1) category = 'A';
    else if (d.tier === 2) category = 'B';

    const outstanding = Number(d.outstanding) || 0;
    const mappedPaymentStatus = d.paymentStatus?.toLowerCase() as PaymentStatus;
    const paymentStatus: PaymentStatus = ['completed', 'overdue', 'pending'].includes(mappedPaymentStatus) 
        ? mappedPaymentStatus 
        : (outstanding > 0 ? 'pending' : 'completed');

    let lastVisit = 'Never Visited';
    let lastVisitOverdue = false;
    const lastDateToUse = d.lastVisitDate || d.lastContactedAt;
    if (lastDateToUse) {
        const diffDays = Math.floor(
            Math.abs(Date.now() - new Date(lastDateToUse).getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 0) lastVisit = 'Today';
        else if (diffDays === 1) lastVisit = '1 day ago';
        else lastVisit = `${diffDays} days ago`;
        if (diffDays > 7) lastVisitOverdue = true;
    }

    return {
        id: String(d.id),
        name: d.name,
        specialty: d.specialization,
        hospital: d.clinic,
        address: d.address,
        city: d.city,
        state: d.state,
        category,
        priority: d.importance ? `${d.importance} Priority` : undefined,
        followUpToday: (d.followUpToday ?? 0) > 0,
        tags: d.tags ?? [],
        weeklyTarget: d.weeklyTarget ?? 0,
        visitCount: d.visitCount ?? 0,
        amount: `₹${d.totalSalesValue || '0.00'}`,
        paymentStatus,
        lastVisit,
        lastVisitOverdue,
        achievement: { done: d.totalVisitsThisMonth ?? d.monthlyAchieved ?? 0, total: d.monthlyTarget ?? 0 },
    };
};

// ─── Pharmacy Types ────────────────────────────────────────────────────────────

export type ApiPharmacy = {
    id: number;
    code: string;
    name: string;
    doctorId: number;
    city: string;
    state: string;
    area: string | null;
    address: string | null;
    phone: string;
    email: string;
    gstin: string | null;
    pricingSlabId: number | null;
    creditLimit: string;
    outstanding: string;
    importance: string;
    assignedMRId: number | null;
    latitude: string | null;
    longitude: string | null;
    lastOrderDate: string | null;
    lastPaymentDate: string | null;
    conversionFailures: number;
    engagementScore: number;
    isActive: boolean;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastVisitDate: string | null;
    visitCount: number;
    pendingFollowUps: number;
    totalOrders: number;
    monthlySalesCurrent: number;
    monthlySalesTarget: number;
    paymentStatus: string;
    preferredProducts?: Array<{ id: number; name: string; totalQuantity: number }>;
    unpreferredProducts?: Array<{ id: number; name: string }>;
    interactionHistory?: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
    pharmacyNetwork?: Array<{ id: number; name: string; type: 'primary' | 'linked' }>;
    nearbyPharmacies?: Array<{ id: number; name: string; distance: number }>;
};

export type Pharmacy = {
    id: string;
    name: string;
    location: string;
    iconBg: string;
    lastVisit: string;
    neverVisited: boolean;
    salesCurrent: number;
    salesTarget: number;
    amount: string;
    paymentStatus: string;
    tags: string[];
    priority?: string;
    visitCount: number;
    pendingFollowUps: number;
    totalOrders: number;
    pharmacyNetwork: Array<{ id: string; name: string; type: 'primary' | 'linked' }>;
    nearbyPharmacies: Array<{ id: string; name: string; distance: string }>;
    preferredProducts: Array<{ id: string; name: string; totalQuantity?: number }>;
    unpreferredProducts: Array<{ id: string; name: string }>;
    interactionHistory: Array<{ date: string; type: string; outcome: string; notes: string; source: string }>;
    lastVisitDate: string | null;
};

const IMPORTANCE_BG: Record<string, string> = {
    High: '#FFF3E0',
    Medium: '#EDE7F6',
    Low: '#E8F5E9',
};

const mapApiPharmacyToUI = (p: ApiPharmacy): Pharmacy => {
    let lastVisit = '';
    let neverVisited = true;
    if (p.lastVisitDate) {
        neverVisited = false;
        const diffDays = Math.floor(
            Math.abs(Date.now() - new Date(p.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 0) lastVisit = 'Today';
        else if (diffDays === 1) lastVisit = '1 day ago';
        else lastVisit = `${diffDays} days ago`;
    }

    const location = p.address ?? `${p.city}, ${p.state}`;
    const iconBg = IMPORTANCE_BG[p.importance] ?? '#E8F5E9';

    return {
        id: String(p.id),
        name: p.name,
        location,
        iconBg,
        lastVisit,
        neverVisited,
        salesCurrent: p.monthlySalesCurrent,
        salesTarget: p.monthlySalesTarget,
        amount: `₹${Number(p.outstanding).toFixed(2)}`,
        paymentStatus: p.paymentStatus,
        tags: p.tags ?? [],
        priority: p.importance ? `${p.importance} Priority` : undefined,
        visitCount: p.visitCount,
        pendingFollowUps: p.pendingFollowUps,
        totalOrders: p.totalOrders,
        pharmacyNetwork: p.pharmacyNetwork?.map(n => ({ id: String(n.id), name: n.name, type: n.type })) ?? [],
        nearbyPharmacies: p.nearbyPharmacies?.map(n => ({ id: String(n.id), name: n.name, distance: `${n.distance} km` })) ?? [],
        preferredProducts: p.preferredProducts?.map(pr => ({ id: String(pr.id), name: pr.name, totalQuantity: pr.totalQuantity })) ?? [],
        unpreferredProducts: p.unpreferredProducts?.map(pr => ({ id: String(pr.id), name: pr.name })) ?? [],
        interactionHistory: p.interactionHistory?.map(i => ({
            date: i.date,
            type: i.type,
            outcome: i.outcome,
            notes: i.notes,
            source: i.source,
        })) ?? [],
        lastVisitDate: p.lastVisitDate,
    };
};

// ─── State ─────────────────────────────────────────────────────────────────────

interface PortfolioState {
    doctors: Doctor[];
    doctorsLoading: boolean;
    doctorsError: string | null;
    pharmacies: Pharmacy[];
    pharmaciesLoading: boolean;
    pharmaciesError: string | null;
}

const initialState: PortfolioState = {
    doctors: [],
    doctorsLoading: false,
    doctorsError: null,
    pharmacies: [],
    pharmaciesLoading: false,
    pharmaciesError: null,
};

// ─── Thunks ────────────────────────────────────────────────────────────────────

export const fetchDoctors = createAsyncThunk<Doctor[], void>(
    'portfolio/fetchDoctors',
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiClient.get<ApiDoctor[]>(ENDPOINTS.portfolio.doctors);
            return res.data.map(mapApiDoctorToUI);
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to fetch doctors'));
        }
    },
);

export const updateDoctorTags = createAsyncThunk<
    { id: string; tags: string[] },
    { id: string; tags: string[] }
>(
    'portfolio/updateDoctorTags',
    async ({ id, tags }, { rejectWithValue }) => {
        try {
            await apiClient.patch(ENDPOINTS.portfolio.doctorDetail(id), { tags });
            return { id, tags };
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to update tags'));
        }
    },
);

export const fetchPharmacies = createAsyncThunk<Pharmacy[], void>(
    'portfolio/fetchPharmacies',
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiClient.get<ApiPharmacy[]>(ENDPOINTS.portfolio.pharmacies);
            return res.data.map(mapApiPharmacyToUI);
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to fetch pharmacies'));
        }
    },
);

export const updatePharmacyTags = createAsyncThunk<
    { id: string; tags: string[] },
    { id: string; tags: string[] }
>(
    'portfolio/updatePharmacyTags',
    async ({ id, tags }, { rejectWithValue }) => {
        try {
            await apiClient.patch(ENDPOINTS.portfolio.pharmacyDetail(id), { tags });
            return { id, tags };
        } catch (error) {
            return rejectWithValue(extractErrorMessage(error, 'Failed to update tags'));
        }
    },
);

// ─── Slice ─────────────────────────────────────────────────────────────────────

const portfolioSlice = createSlice({
    name: 'portfolio',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Doctors
            .addCase(fetchDoctors.pending, (state) => {
                state.doctorsLoading = true;
                state.doctorsError = null;
            })
            .addCase(fetchDoctors.fulfilled, (state, action) => {
                state.doctorsLoading = false;
                state.doctors = action.payload;
            })
            .addCase(fetchDoctors.rejected, (state, action) => {
                state.doctorsLoading = false;
                state.doctorsError = (action.payload as string) ?? 'Failed to fetch doctors';
            })
            // Update doctor tags
            .addCase(updateDoctorTags.fulfilled, (state, action) => {
                const { id, tags } = action.payload;
                const doctor = state.doctors.find(d => d.id === id);
                if (doctor) {
                    doctor.tags = tags;
                }
            })
            // Pharmacies
            .addCase(fetchPharmacies.pending, (state) => {
                state.pharmaciesLoading = true;
                state.pharmaciesError = null;
            })
            .addCase(fetchPharmacies.fulfilled, (state, action) => {
                state.pharmaciesLoading = false;
                state.pharmacies = action.payload;
            })
            .addCase(fetchPharmacies.rejected, (state, action) => {
                state.pharmaciesLoading = false;
                state.pharmaciesError = (action.payload as string) ?? 'Failed to fetch pharmacies';
            })
            // Update pharmacy tags
            .addCase(updatePharmacyTags.fulfilled, (state, action) => {
                const { id, tags } = action.payload;
                const pharmacy = state.pharmacies.find(p => p.id === id);
                if (pharmacy) {
                    pharmacy.tags = tags;
                }
            });
    },
});

export default portfolioSlice.reducer;
