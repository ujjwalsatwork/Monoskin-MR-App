import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { MonoskinLogo } from '@/assets/images';
import { COLORS } from '@/constants/colors';
import {
  restoreNavConsumed,
  selectActiveSession,
  selectPendingRestoreNav,
  selectSessionHydrated,
} from '@/redux/slices/visitSessionSlice';
import { OngoingVisit, toVisitRouteParams } from '@/services/visitSessionStorage';
import ActiveVisitBanner from '@/components/common/ActiveVisitBanner';
import { navigationRef } from './navigationRef';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import VisitDetailScreen from '@/screens/Visits/VisitDetailScreen';
import CreateOrderScreen from '@/screens/Orders/CreateOrderScreen';
import ProductDetailScreen from '@/screens/Orders/ProductDetailScreen';
import PaymentScreen from '@/screens/Orders/PaymentScreen';
import PaymentSuccessScreen from '@/screens/Orders/PaymentSuccessScreen';
import PaymentFailedScreen from '@/screens/Orders/PaymentFailedScreen';
import OrderDetailScreen from '@/screens/Orders/OrderDetailScreen';
import CheckInSuccessScreen from '@/screens/Home/CheckInSuccessScreen';
import CheckOutSuccessScreen from '@/screens/Home/CheckOutSuccessScreen';
import AttendanceHistoryScreen from '@/screens/Home/AttendanceHistoryScreen';
import RouteMapScreen from '@/screens/Route/RouteMapScreen';
import TodayVisitsScreen from '@/screens/Home/TodayVisitsScreen';
import PharmacyDetailScreen from '@/screens/Portfolio/PharmacyDetailScreen';
import PharmacyOrderScreen from '@/screens/Portfolio/PharmacyOrderScreen';
import AddLeadScreen from '@/screens/Leads/AddLeadScreen';
import AddPharmacyLeadScreen from '@/screens/Leads/AddPharmacyLeadScreen';
import LeadDetailsScreen from '@/screens/Leads/LeadDetailsScreen';
import NotificationsScreen from '@/screens/Notifications/NotificationsScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import EditProfileScreen from '@/screens/Profile/EditProfileScreen';
import SubmitLeaveScreen from '@/screens/Home/SubmitLeaveScreen';
import ExpenseManagementScreen from '@/screens/Profile/ExpenseManagementScreen';
import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * When a visit was running at the time the OS killed the app, rebuild the stack
 * with VisitDetail already on top instead of navigating there imperatively after
 * Main mounts — an effect-driven `navigate()` flashes Home, races the tab
 * navigator's own mount, and can no-op if it fires before the container is ready.
 *
 * Two entries, not one: `Main` sits beneath so `goBack()` (the header chevron,
 * and the post-submit goBack) has a legitimate destination.
 */
const buildInitialState = (session: OngoingVisit | null) => {
  if (!session) { return undefined; }
  return {
    index: 1,
    routes: [
      { name: 'Main' as const },
      { name: 'VisitDetail' as const, params: toVisitRouteParams(session) },
    ],
  };
};

const AppNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const activeSession = useSelector(selectActiveSession);
  const sessionHydrated = useSelector(selectSessionHydrated);
  const pendingRestoreNav = useSelector(selectPendingRestoreNav);
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();

  // `initialState` is only read on the container's first mount, so resolve it
  // exactly once — on the first render that clears the splash gate, by which
  // point hydration has completed.
  const initialStateRef = useRef<ReturnType<typeof buildInitialState>>(undefined);
  const initialStateResolved = useRef(false);

  // Tracks the innermost active route so the global banner can show itself only
  // over the tab area — where an MR who lost their place actually ends up.
  const syncCurrentRoute = useCallback(() => {
    setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
  }, []);

  // Consumes the one-shot restore signal raised by hydration.
  //
  // On a cold start `initialState` has already placed VisitDetail on top, so this
  // resolves to a no-op navigate. It earns its keep on the re-login path: an auth
  // 401 wipes the slice while the app keeps running, and by the time the MR logs
  // back in `initialState` has long been consumed — this is the only thing that
  // can put them back on their visit without an app restart.
  useEffect(() => {
    if (!pendingRestoreNav || !activeSession || !navigationRef.isReady()) { return; }
    navigationRef.navigate('VisitDetail', toVisitRouteParams(activeSession));
    dispatch(restoreNavConsumed());
  }, [pendingRestoreNav, activeSession, currentRouteName, dispatch]);

  // Hold the splash until the ongoing-visit read resolves, so the restored
  // stack is built before the first paint. Reuses the existing auth splash —
  // no extra loading state, no Home-flash.
  if (isLoading || (isAuthenticated && !sessionHydrated)) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoWrapper}>
          <MonoskinLogo height={300} width={100} />
        </View>
      </View>
    );
  }

  if (!initialStateResolved.current) {
    initialStateResolved.current = true;
    // Only when authenticated — `VisitDetail` doesn't exist in the auth branch.
    initialStateRef.current = buildInitialState(isAuthenticated ? activeSession : null);
  }

  return (
    <View style={styles.root}>
    <NavigationContainer
      ref={navigationRef}
      initialState={initialStateRef.current}
      onReady={syncCurrentRoute}
      onStateChange={syncCurrentRoute}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen
              name="VisitDetail"
              component={VisitDetailScreen}
              // Belt-and-braces alongside `usePreventRemove` in the screen: kills
              // the iOS swipe-back so an accidental edge swipe can't drop a visit.
              options={{ headerShown: false, gestureEnabled: false }}
            />
            <Stack.Screen
              name="CreateOrder"
              component={CreateOrderScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ProductDetail"
              component={ProductDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Payment"
              component={PaymentScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PaymentSuccess"
              component={PaymentSuccessScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PaymentFailed"
              component={PaymentFailedScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="OrderDetail"
              component={OrderDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="CheckInSuccess" 
              component={CheckInSuccessScreen} 
            />
            <Stack.Screen
              name="CheckOutSuccess"
              component={CheckOutSuccessScreen}
            />
            <Stack.Screen
              name="AttendanceHistory"
              component={AttendanceHistoryScreen}
            />
            <Stack.Screen
              name="RouteMapScreen"
              component={RouteMapScreen}
            />
            <Stack.Screen
              name="TodayVisits"
              component={TodayVisitsScreen}
            />
            <Stack.Screen
              name="PharmacyDetail"
              component={PharmacyDetailScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="PharmacyOrder"
              component={PharmacyOrderScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddDoctorLead"
              component={AddLeadScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="AddPharmacyLead"
              component={AddPharmacyLeadScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="LeadDetails"
              component={LeadDetailsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="SubmitLeave"
              component={SubmitLeaveScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ExpenseManagement"
              component={ExpenseManagementScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    {/* Rendered as a sibling of the container, inside a flex root, so the
        absolutely-positioned pill has an unambiguous containing block and always
        paints above the navigator. It navigates via `navigationRef`, so it needs
        no navigation context of its own. */}
    {isAuthenticated && <ActiveVisitBanner currentRouteName={currentRouteName} />}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  logoWrapper: {
    marginBottom: 20,
    transform: [{ scale: 1.5 }], // Scale up the logo slightly for the splash screen
  },
});

export default AppNavigator;
