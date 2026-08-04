import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '@/redux/store';
import AppNavigator from '@/navigation/AppNavigator';
import { useAuth } from '@/hooks/useAuth';
import {
  hydrateVisitSession,
  selectSessionHydratedFor,
  selectSessionOwnerId,
} from '@/redux/slices/visitSessionSlice';

const AppContent = () => {
  const { checkAuth } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const authLoading = useSelector((state: RootState) => state.auth.isLoading);
  const ownerId = useSelector(selectSessionOwnerId);
  const hydratedFor = useSelector(selectSessionHydratedFor);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Restore any visit that was running when the OS killed the process. Must run
  // *after* auth resolves so the owner id is known — a session is validated
  // against its owner before it is restored.
  //
  // Keyed on the identity, not a one-shot flag: an auth 401 resets the slice and
  // re-hydration then runs with no user, so without this the visit would only
  // reappear on the next cold start rather than right after the MR logs back in.
  useEffect(() => {
    if (authLoading) { return; }
    if (hydratedFor === ownerId) { return; }
    dispatch(hydrateVisitSession());
  }, [authLoading, ownerId, hydratedFor, dispatch]);

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <AppNavigator />
    </>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AppContent />
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
