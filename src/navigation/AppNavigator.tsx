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
  );
};

export default AppNavigator;
