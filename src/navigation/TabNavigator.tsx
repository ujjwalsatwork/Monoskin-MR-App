import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AttendanceScreen from '@/screens/Home/AttendanceScreen';
import RouteScreen from '@/screens/Route/RouteScreen';
import PortfolioScreen from '@/screens/Portfolio/PortfolioScreen';
import ProfileScreen from '@/screens/Profile/ProfileScreen';
import VisitListScreen from '@/screens/Visits/VisitListScreen';
import { MainTabParamList } from './types';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { 
  HomeTabIcon, 
  RouteTabIcon, 
  PortfolioTabIcon, 
  SessionsTabIcon, 
  LeadsTabIcon 
} from '@/assets/images';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontFamily: FONTS.family.bold,
          fontSize: 10,
        },
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 80 : 60,
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={AttendanceScreen} 
        options={{
           tabBarIcon: ({ color }) => <HomeTabIcon stroke={color} />
        }}
      />
      <Tab.Screen 
        name="Route" 
        component={RouteScreen} 
        options={{
           tabBarIcon: ({ color }) => <RouteTabIcon stroke={color} />
        }}
      />
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{
           tabBarIcon: ({ color }) => <PortfolioTabIcon stroke={color} />
        }}
      />
      <Tab.Screen 
        name="Sessions" 
        component={VisitListScreen} 
        options={{
           tabBarIcon: ({ color }) => <SessionsTabIcon stroke={color} />
        }}
      />
      <Tab.Screen 
        name="Leads" 
        component={ProfileScreen} 
        options={{
           tabBarIcon: ({ color }) => <LeadsTabIcon stroke={color} />
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
