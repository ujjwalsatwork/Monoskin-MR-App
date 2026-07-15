export const ENDPOINTS = {
    auth: {
        sendOtp: '/auth/send-otp',
        verifyOtp: '/auth/verify-otp',
        me: '/auth/me',
        logout: '/auth/logout',
    },
    attendance: {
        log: '/mr-attendance',
        today: '/mr-attendance/today',
        history: (mrId: number) => `/mrs/${mrId}/attendance`,
    },
    portfolio: {
        doctors: '/doctors',
        doctorDetail: (id: string) => `/doctors/${id}`,
        pharmacies: '/pharmacies',
        pharmacyDetail: (id: string) => `/pharmacies/${id}`,
        leadDetail: (id: string) => `/leads/${id}`,
    },
    products: {
        list: '/products',
        available: '/products/available',
        detail: (id: number) => `/products/${id}`,
    },
    sampleAllocations: {
        // Sample products allocated to the authenticated MR with remaining stock.
        list: '/mr-sample-allocations',
    },
    orders: {
        create: '/orders',
        addItems: (orderId: number) => `/orders/${orderId}/items`,
        detail: (orderId: number) => `/orders/${orderId}`,
        items: (orderId: number) => `/orders/${orderId}/items`,
        generateInvoice: (orderId: number) => `/orders/${orderId}/generate-invoice`,
    },
    profile: {
        me: '/profile/me',
    },
    mrVisits: {
        create: '/mr-visits',
    },
    mrRoutes: {
        list: '/mr-routes',
    },
    payments: {
        createOrder: '/payments/create-order',
        verify: '/payments/verify',
        createLink: '/payments/create-link',
    },
    assets: {
        list: '/assets',
        markDownloaded: (id: number) => `/assets/${id}/download`,
    },
    notifications: {
        list: '/notifications',
        markRead: (id: number) => `/notifications/${id}/read`,
        markAllRead: '/notifications/read-all',
    },
    leaveRequests: {
        create: '/leave-requests',
    },
    mrBreaks: {
        start: '/mr-breaks/start',
        end: '/mr-breaks/end',
        today: '/mr-breaks/today',
    },
    schemes: {
        list: '/schemes',
    },
    promoCodes: {
        list: '/promo-codes',
    },
    clinicCodes: {
        list: '/clinic-codes',
    },
    pricingSlabs: {
        detail: (id: number) => `/pricing-slabs/${id}`,
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
