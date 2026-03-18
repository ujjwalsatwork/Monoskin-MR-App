import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import VisitDetailScreen from '@/screens/Visits/VisitDetailScreen';
import CreateOrderScreen from '@/screens/Orders/CreateOrderScreen';
import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  if (isLoading) {
    // We could return a SplashScreen here
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen 
              name="VisitDetail" 
              component={VisitDetailScreen} 
              options={{ headerShown: true, title: 'Visit Details' }}
            />
            <Stack.Screen 
              name="CreateOrder" 
              component={CreateOrderScreen} 
              options={{ headerShown: true, title: 'Create Order' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
