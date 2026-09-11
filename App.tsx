import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, StatusBar } from 'react-native';
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
import {
  hydrateLeadDrafts,
  selectDraftOwnerId,
  selectDraftsHydratedFor,
  selectPendingDraftCount,
  syncLeadDrafts,
} from '@/redux/slices/leadDraftSlice';

const AppContent = () => {
  const { checkAuth } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const authLoading = useSelector((state: RootState) => state.auth.isLoading);
  const ownerId = useSelector(selectSessionOwnerId);
  const hydratedFor = useSelector(selectSessionHydratedFor);
  const draftOwnerId = useSelector(selectDraftOwnerId);
  const draftsHydratedFor = useSelector(selectDraftsHydratedFor);
  const pendingDrafts = useSelector(selectPendingDraftCount);

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

  // Same contract for unsent lead submissions: read them back once auth has
  // resolved, keyed on the identity so they also reappear right after a re-login.
  useEffect(() => {
    if (authLoading) { return; }
    if (draftsHydratedFor === draftOwnerId) { return; }
    dispatch(hydrateLeadDrafts());
  }, [authLoading, draftOwnerId, draftsHydratedFor, dispatch]);

  // Drain the queue as soon as drafts are known and an MR is signed in. This is
  // the launch trigger — the one that files everything an MR queued yesterday in
  // a dead zone, without them doing anything.
  useEffect(() => {
    if (authLoading || draftOwnerId == null) { return; }
    if (draftsHydratedFor !== draftOwnerId) { return; }
    if (pendingDrafts === 0) { return; }
    dispatch(syncLeadDrafts());
    // Intentionally not depending on `pendingDrafts` changing downward: this fires
    // when hydration completes with work outstanding, and the foreground handler
    // below covers every later opportunity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, draftOwnerId, draftsHydratedFor, dispatch]);

  // Returning to the foreground is the other realistic moment an MR regains
  // signal. React Native runs no JS while the app is killed, so this plus the
  // launch trigger above is the whole of "automatic" — nothing in the UI claims
  // drafts are sent in the background.
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const cameToForeground = appState.current.match(/inactive|background/) && next === 'active';
      appState.current = next;
      if (!cameToForeground) { return; }
      if (store.getState().auth?.user?.id == null) { return; }
      if (selectPendingDraftCount(store.getState()) === 0) { return; }
      dispatch(syncLeadDrafts());
    });
    return () => sub.remove();
  }, [dispatch]);

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
