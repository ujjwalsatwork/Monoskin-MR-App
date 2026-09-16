export type OrderItemPayload = {
    productId: number;
    productName?: string;
    quantity: number;
    unitPrice: string;
    discount: string;
    tax: string;
    total: string;
    gst?: string;
    isFreeGood?: boolean;
};

export type OrderCreateData = {
    doctorId?: number;
    pharmacyId?: number;
    warehouseId?: number;
    shippingAddress: string;
    notes: string;
    reasonTag: string;
    items: OrderItemPayload[];
};

// MOB-02 — the `DeviceBinding` / `RequestUnbind` / `UnbindSuccess` routes were
// removed. They presented a device-binding control that was wired to nothing: the
// confirm button called a `login` function that does not exist on `useAuth()`, so
// it always threw, and the session had already been granted at the previous step
// regardless. The ERP has no device-registration endpoint to bind against either
// (there is no device column in the schema and no bind/unbind route on the server),
// so the screens could not be made real from the app side alone.
//
// An inert control is worse than an absent one, because it gets relied upon. If
// device binding becomes a product requirement, it needs a server-side register
// step first; the removed screens are in git history at commit dd7e6e0.
export type AuthStackParamList = {
    Login: undefined;
    OTP: { mobileNumber: string };
    ContactSupport: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Route: undefined;
    Portfolio: undefined;
    Assets: undefined;
    Leads: undefined;
};

export type AppStackParamList = {
    Auth: undefined;
    Main: undefined;
    VisitDetail: { doctorId?: string; pharmacyId?: string; leadId?: string; routeStopId?: number; visitId?: string };
    CreateOrder: { doctorId: string };
    ProductDetail: { productId: string; productName: string; productTime: string };
    Payment: { subtotal: number; orderNumber: string; orderCreateData: OrderCreateData };
    PaymentSuccess: {
        orderId: number;
        orderNumber: string;
        totalAmount: number;
        paymentMethod: string;
        last4: string;
        dateTime: string;
    };
    PaymentFailed: {
        orderNumber: string;
        totalAmount: number;
        transactionId: string;
        reason: string;
        date: string;
        paymentMethod: string;
        last4: string;
    };
    OrderDetail: {
        orderId: number;
        orderNumber: string;
    };
    CheckInSuccess: { 
        time: string; 
        locationText: string; 
        subLocationText: string; 
    };
    CheckOutSuccess: {
        time: string;
        doctorName: string;
        doctorLocation: string;
        pharmacyName: string;
        pharmacyLocation: string;
    };
    AttendanceHistory: undefined;
    TodayVisits: undefined;
    PharmacyDetail: { pharmacyId: string; pharmacyName: string };
    PharmacyOrder: { pharmacyId: string; pharmacyName: string };
    // `draft` reopens an unsent local submission (see leadDraftStorage): the form
    // is refilled from the stored payload and keeps the draft's original `code`, so
    // resubmitting resolves to the same lead server-side instead of a duplicate.
    AddDoctorLead: { editMode?: boolean; leadData?: any; draftId?: string } | undefined;
    AddPharmacyLead: { editMode?: boolean; leadData?: any; draftId?: string } | undefined;
    LeadDetails: { leadId: string; category?: 'Doctors' | 'Pharmacies' };
    Notifications: undefined;
    Profile: undefined;
    EditProfile: undefined;
    SubmitLeave: undefined;
    ExpenseManagement: undefined;
    RouteMapScreen: {
        routeData: {
            readOnly: boolean;
            origin: { lat: number; lng: number };
            stops: Array<{
                id: number;
                name: string;
                lat: number;
                lng: number;
                status: 'DONE' | 'TARGET' | 'UPCOMING';
                distanceStr?: string;
                timeStr?: string;
                address: string;
                phone?: string;
            }>;
        };
    };
};
