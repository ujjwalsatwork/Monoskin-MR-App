import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { AppDispatch } from '@/redux/store';
import {
    selectActiveSession,
    selectSessionOwnerId,
    sessionStarted,
    startVisitSession,
} from '@/redux/slices/visitSessionSlice';
import {
    VisitTargetType,
    buildSession,
    toVisitRouteParams,
} from '@/services/visitSessionStorage';

// ─────────────────────────────────────────────────────────────────────────────
// The one gate every "Start Visit" button goes through.
//
// Centralising it here means mutual exclusion cannot be forgotten at a call
// site, and the duration anchor is stamped at the moment the MR confirms —
// not when VisitDetailScreen finishes its detail fetch + GPS lookup, which
// would silently shave seconds off every visit.
// ─────────────────────────────────────────────────────────────────────────────

type NavProp = NativeStackNavigationProp<AppStackParamList>;

export interface StartVisitTarget {
    visitType: VisitTargetType;
    targetId: string | number;
    routeStopId?: number;
    /** Entity name — shown in the mutual-exclusion alert and the resume banner. */
    name: string;
    subtitle?: string;
    category?: 'Doctors' | 'Pharmacies';
}

/** Per-card button state. */
export type TargetVisitState = 'idle' | 'active-here' | 'active-elsewhere';

export const useStartVisit = () => {
    const navigation = useNavigation<NavProp>();
    const dispatch = useDispatch<AppDispatch>();
    const activeSession = useSelector(selectActiveSession);
    // Stamped from the same selector the cold-boot restore validates against —
    // they must never drift apart, or a restored session is read as a foreign one.
    const ownerId = useSelector(selectSessionOwnerId);
    // Swallows a double-tap while the confirmation is being processed.
    const startingRef = useRef(false);

    const resume = useCallback(() => {
        if (!activeSession) { return; }
        navigation.navigate('VisitDetail', toVisitRouteParams(activeSession));
    }, [activeSession, navigation]);

    const getTargetState = useCallback(
        (visitType: VisitTargetType, targetId: string | number): TargetVisitState => {
            if (!activeSession) { return 'idle'; }
            if (
                activeSession.visitType === visitType &&
                activeSession.targetId === String(targetId)
            ) {
                return 'active-here';
            }
            return 'active-elsewhere';
        },
        [activeSession],
    );

    const start = useCallback(
        (target: StartVisitTarget) => {
            const state = getTargetState(target.visitType, target.targetId);

            // Already on this target — walk straight back in, timer untouched.
            if (state === 'active-here') {
                resume();
                return;
            }

            // Mutual exclusion. A dimmed-but-tappable button that explains itself
            // and offers a way back beats a dead disabled control.
            if (state === 'active-elsewhere' && activeSession) {
                Alert.alert(
                    'Visit already in progress',
                    `A visit with ${activeSession.metadata.name} is already running. Finish or cancel that visit before starting a new one.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Go to Visit', onPress: resume },
                    ],
                );
                return;
            }

            if (!ownerId) {
                Alert.alert('Session Error', 'User session not found. Please login again.');
                return;
            }

            Alert.alert(
                'Start Visit?',
                'Are you sure you want to start this visit? This will initiate the official session timer.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Start Visit',
                        onPress: () => {
                            if (startingRef.current) { return; }
                            startingRef.current = true;

                            const session = buildSession({
                                mrId: ownerId,
                                visitType: target.visitType,
                                targetId: target.targetId,
                                routeStopId: target.routeStopId,
                                name: target.name,
                                subtitle: target.subtitle,
                                category: target.category,
                                // The anchor: stamped at the tap, never again.
                                startTimeStamp: Date.now(),
                            });

                            // Synchronous — locks out the other two modules before
                            // the navigation animation even begins.
                            dispatch(sessionStarted(session));
                            navigation.navigate('VisitDetail', toVisitRouteParams(session));
                            // Durability write is fire-and-forget; the process cannot
                            // die between the two synchronous statements above.
                            const release = () => { startingRef.current = false; };
                            dispatch(startVisitSession(session)).then(release, release);
                        },
                    },
                ],
            );
        },
        [activeSession, dispatch, getTargetState, ownerId, navigation, resume],
    );

    return {
        activeSession,
        isVisitActive: !!activeSession,
        getTargetState,
        start,
        resume,
    };
};
