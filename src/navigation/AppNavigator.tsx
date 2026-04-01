import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import VisitDetailScreen from '@/screens/Visits/VisitDetailScreen';
import CreateOrderScreen from '@/screens/Orders/CreateOrderScreen';
import ProductDetailScreen from '@/screens/Orders/ProductDetailScreen';
import CheckInSuccessScreen from '@/screens/Home/CheckInSuccessScreen';
import CheckOutSuccessScreen from '@/screens/Home/CheckOutSuccessScreen';
import AttendanceHistoryScreen from '@/screens/Home/AttendanceHistoryScreen';
import RouteMapScreen from '@/screens/Route/RouteMapScreen';
import TodayVisitsScreen from '@/screens/Home/TodayVisitsScreen';
import PharmacyDetailScreen from '@/screens/Portfolio/PharmacyDetailScreen';
import PharmacyOrderScreen from '@/screens/Portfolio/PharmacyOrderScreen';
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
              options={{ headerShown: false }}
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
