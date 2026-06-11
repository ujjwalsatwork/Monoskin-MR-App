import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import AppNavigator from '@/navigation/AppNavigator';
import { useAuth } from '@/hooks/useAuth';

const AppContent = () => {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
