export const ENDPOINTS = {
    auth: {
        sendOtp: '/auth/send-otp',
        verifyOtp: '/auth/verify-otp',
        me: '/auth/me',
        logout: '/auth/logout',
    },
    attendance: {
        log: '/mr-attendance',
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
