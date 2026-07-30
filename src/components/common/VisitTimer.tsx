import React, { memo, useEffect, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { ClockIcon } from '@/assets/images';

// ─────────────────────────────────────────────────────────────────────────────
// Visit duration display.
//
// Every tick RE-DERIVES from the immutable anchor instead of incrementing a
// counter. That single decision is what makes this robust:
//   • drift is impossible — JS intervals are not real-time, a derivation is
//   • background throttling is harmless — missed ticks simply don't matter
//   • a multi-hour kill costs nothing — the first render after restore is
//     already correct, with no catch-up loop
// ─────────────────────────────────────────────────────────────────────────────

const computeElapsed = (startTimeStamp: number): number =>
    // Clamped: a backwards device-clock change must never produce a negative.
    Math.max(0, Math.floor((Date.now() - startTimeStamp) / 1000));

export const formatDuration = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return hrs > 0 ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};

interface VisitTimerProps {
    startTimeStamp: number;
    /** Compact inline variant used by the global resume banner. */
    compact?: boolean;
}

const VisitTimer = ({ startTimeStamp, compact = false }: VisitTimerProps) => {
    const [elapsed, setElapsed] = useState(() => computeElapsed(startTimeStamp));

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const tick = () => setElapsed(computeElapsed(startTimeStamp));

        const startTicking = () => {
            // Recompute FIRST, then resume ticking. On the background → active
            // transition this snaps the display to the true elapsed time before
            // the next paint, so the MR never sees a stale number after unlock.
            tick();
            if (!interval) { interval = setInterval(tick, 1000); }
        };

        const stopTicking = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        startTicking();

        const onAppStateChange = (next: AppStateStatus) => {
            if (next === 'active') { startTicking(); } else { stopTicking(); }
        };

        const sub = AppState.addEventListener('change', onAppStateChange);

        return () => {
            stopTicking();
            sub.remove();
        };
    }, [startTimeStamp]);

    if (compact) {
        return <Text style={styles.compactValue}>{formatDuration(elapsed)}</Text>;
    }

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <View style={styles.liveDot} />
                <ClockIcon width={13} height={13} />
                <Text style={styles.label}>  Visit Duration</Text>
            </View>
            <Text style={styles.value}>{formatDuration(elapsed)}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(46, 80, 178, 0.08)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 10,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
        marginRight: 8,
    },
    label: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.medium,
        color: COLORS.textSecondary,
    },
    value: {
        fontSize: FONTS.size.xl,
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
        // Fixed-width digits so the value doesn't jitter every second.
        fontVariant: ['tabular-nums'],
    },
    compactValue: {
        fontSize: FONTS.size.sm,
        fontFamily: FONTS.family.bold,
        color: COLORS.white,
        fontVariant: ['tabular-nums'],
    },
});

// Memoized: it re-renders at 1 Hz and must not drag its 2,300-line parent along.
export default memo(VisitTimer);
