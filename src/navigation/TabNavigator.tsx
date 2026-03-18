import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '@/screens/Dashboard/DashboardScreen';
import VisitListScreen from '@/screens/Visits/VisitListScreen';
import OrderListScreen from '@/screens/Orders/OrderListScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import { MainTabParamList } from './types';
import { COLORS } from '@/constants/colors';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Visits" component={VisitListScreen} />
      <Tab.Screen name="Orders" component={OrderListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default TabNavigator;
