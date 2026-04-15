export type AuthStackParamList = {
    Login: undefined;
    OTP: { mobileNumber: string };
    DeviceBinding: undefined;
    RequestUnbind: undefined;
    UnbindSuccess: { deviceName: string; deviceId: string; reason: string };
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
    VisitDetail: { visitId: string };
    CreateOrder: { doctorId: string };
    ProductDetail: { productId: string; productName: string; productTime: string };
    Payment: { subtotal: number; orderNumber: string };
    PaymentSuccess: {
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
        orderNumber: string;
        totalAmount: number;
        subtotal: number;
        orderDate: string;
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
    AddDoctorLead: { editMode?: boolean; leadData?: any } | undefined;
    AddPharmacyLead: { editMode?: boolean; leadData?: any } | undefined;
    LeadDetails: { leadId: string; category?: 'Doctors' | 'Pharmacies' };
    Notifications: undefined;
    Profile: undefined;
    RouteMapScreen: {
        routeData: {
            origin: { lat: number, lng: number };
            stops: Array<{
                id: number;
                name: string;
                lat: number;
                lng: number;
                status: 'done' | 'target' | 'upcoming';
                distanceStr: string;
                timeStr: string;
                address: string;
                phone: string;
            }>;
        };
    };
};
