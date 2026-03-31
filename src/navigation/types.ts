export type AuthStackParamList = {
    Login: undefined;
    OTP: { mobileNumber: string };
    DeviceBinding: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    Route: undefined;
    Portfolio: undefined;
    Sessions: undefined;
    Leads: undefined;
};

export type AppStackParamList = {
    Auth: undefined;
    Main: undefined;
    VisitDetail: { visitId: string };
    CreateOrder: undefined;
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
