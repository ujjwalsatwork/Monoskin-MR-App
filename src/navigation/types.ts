export type AuthStackParamList = {
    Login: undefined;
    OTP: { mobileNumber: string };
    DeviceBinding: undefined;
};

export type MainTabParamList = {
    Dashboard: undefined;
    Visits: undefined;
    Orders: undefined;
    Profile: undefined;
};

export type AppStackParamList = {
    Auth: undefined;
    Main: undefined;
    VisitDetail: { visitId: string };
    CreateOrder: undefined;
};
