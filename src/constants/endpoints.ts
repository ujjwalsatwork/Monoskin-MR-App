export const ENDPOINTS = {
    auth: {
        sendOtp: '/auth/send-otp',
        verifyOtp: '/auth/verify-otp',
        me: '/auth/me',
        logout: '/auth/logout',
    },
    attendance: {
        log: '/mr-attendance',
        history: (mrId: number) => `/mrs/${mrId}/attendance`,
    },
    portfolio: {
        doctors: '/doctors',
        doctorDetail: (id: string) => `/doctors/${id}`,
        pharmacies: '/pharmacies',
        pharmacyDetail: (id: string) => `/pharmacies/${id}`,
    },
    products: {
        list: '/products',
        detail: (id: number) => `/products/${id}`,
    },
    orders: {
        create: '/orders',
        addItems: (orderId: number) => `/orders/${orderId}/items`,
        detail: (orderId: number) => `/orders/${orderId}`,
        items: (orderId: number) => `/orders/${orderId}/items`,
    },
    profile: {
        me: '/profile/me',
    },
    // user: {
    //     profile: '/user/profile',
    //     updateProfile: '/user/update-profile',
    // },
    // visits: {
    //     list: '/visits',
    //     detail: (id: string) => `/visits/${id}`,
    //     checkIn: '/visits/check-in',
    //     checkOut: '/visits/check-out',
    // },
    // orders: {
    //     list: '/orders',
    //     detail: (id: string) => `/orders/${id}`,
    //     create: '/orders/create',
    // },
    // attendance: {
    //     history: '/attendance/history',
    // },
} as const;
