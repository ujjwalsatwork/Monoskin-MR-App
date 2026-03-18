import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Visit {
    id: string;
    doctorName: string;
    specialty: string;
    date: string;
    status: 'pending' | 'completed' | 'cancelled';
}

interface VisitState {
    list: Visit[];
    selectedVisit: Visit | null;
    loading: boolean;
}

const initialState: VisitState = {
    list: [],
    selectedVisit: null,
    loading: false,
};

const visitSlice = createSlice({
    name: 'visits',
    initialState,
    reducers: {
        setVisits: (state, action: PayloadAction<Visit[]>) => {
            state.list = action.payload;
        },
        selectVisit: (state, action: PayloadAction<Visit | null>) => {
            state.selectedVisit = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
    },
});

export const { setVisits, selectVisit, setLoading } = visitSlice.actions;
export default visitSlice.reducer;
