import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { selectActiveSession } from '@/redux/slices/visitSessionSlice';
import { toVisitRouteParams } from '@/services/visitSessionStorage';
import { navigationRef } from '@/navigation/navigationRef';
import VisitTimer from './VisitTimer';

// ─────────────────────────────────────────────────────────────────────────────
// Global "visit in progress" pill.
//
// Even if the boot nav guard is bypassed for any reason, the MR is always one
// tap away from their running visit. This is what kills the "the app forgot my
// visit" support ticket outright.
//
// Only shown over the tab area — that's where an MR ends up when they lose
// their place, and it's the only region with a known bottom inset to clear.
// ─────────────────────────────────────────────────────────────────────────────

const TAB_ROUTES = ['Home', 'Route', 'Portfolio', 'Assets', 'Leads'];

interface ActiveVisitBannerProps {
    /** Innermost active route name, fed by NavigationContainer's onStateChange. */
    currentRouteName?: string;
}

const ActiveVisitBanner = ({ currentRouteName }: ActiveVisitBannerProps) => {
    const session = useSelector(selectActiveSession);
    const insets = useSafeAreaInsets();

    if (!session || !currentRouteName || !TAB_ROUTES.includes(currentRouteName)) {
        return null;
    }

    // Mirrors the tab bar height computed in TabNavigator so the pill sits just
    // above it rather than behind it.
    const tabBarHeight = Platform.OS === 'ios' ? 80 : 60 + insets.bottom;

    return (
        <View style={[styles.wrapper, { bottom: tabBarHeight + 10 }]} pointerEvents="box-none">
            <TouchableOpacity
                style={styles.banner}
                activeOpacity={0.9}
                onPress={() => {
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('VisitDetail', toVisitRouteParams(session));
                    }
                }}
            >
                <View style={styles.liveDot} />
                <View style={styles.textBlock}>
                    <Text style={styles.title} numberOfLines={1}>
                        Visit in progress · {session.metadata.name}
                    </Text>
                    <VisitTimer startTimeStamp={session.startTimeStamp} compact />
                </View>
                <Text style={styles.action}>Resume</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 12,
        right: 12,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.buttonBlue,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 10,
        elevation: 6,
        shadowColor: COLORS.black,
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.secondary,
        marginRight: 10,
    },
    textBlock: {
        flex: 1,
    },
    title: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.bold,
        color: COLORS.white,
    },
    action: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.bold,
        color: COLORS.white,
        textDecorationLine: 'underline',
        marginLeft: 12,
    },
});

export default ActiveVisitBanner;
