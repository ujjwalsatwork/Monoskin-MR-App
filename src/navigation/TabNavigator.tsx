import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AttendanceScreen from '@/screens/Home/AttendanceScreen';
import RouteScreen from '@/screens/Route/RouteScreen';
import PortfolioScreen from '@/screens/Portfolio/PortfolioScreen';
import LeadsScreen from '@/screens/Leads/LeadsScreen';
import AssetsScreen from '@/screens/Assets/AssetsScreen';
import { MainTabParamList } from './types';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  HomeTabIcon,
  RouteTabIcon,
  PortfolioTabIcon,
  AssetsTabIcon,
  LeadsTabIcon
} from '@/assets/images';

const Tab = createBottomTabNavigator<MainTabParamList>();

const homeIcon = ({ color }: { color: string }) => <HomeTabIcon stroke={color} />;
const routeIcon = ({ color }: { color: string }) => <RouteTabIcon stroke={color} />;
const portfolioIcon = ({ color }: { color: string }) => <PortfolioTabIcon stroke={color} />;
const assetsIcon = ({ color }: { color: string }) => <AssetsTabIcon stroke={color} />;
const leadsIcon = ({ color }: { color: string }) => <LeadsTabIcon stroke={color} />;

const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;

  const screenOptions = useMemo(() => ({
    headerShown: false,
    tabBarActiveTintColor: COLORS.primary,
    tabBarInactiveTintColor: COLORS.textSecondary,
    tabBarLabelStyle: {
      fontFamily: FONTS.family.bold,
      fontSize: 10,
    },
    tabBarStyle: {
      paddingBottom: Platform.OS === 'ios' ? 20 : Math.max(bottomInset, 5),
      paddingTop: 5,
      height: Platform.OS === 'ios' ? 80 : 60 + bottomInset,
    },
  }), [bottomInset]);

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="Home"
        component={AttendanceScreen}
        options={{ tabBarIcon: homeIcon }}
      />
      <Tab.Screen
        name="Route"
        component={RouteScreen}
        options={{ tabBarIcon: routeIcon }}
      />
      <Tab.Screen
        name="Portfolio"
        component={PortfolioScreen}
        options={{ tabBarIcon: portfolioIcon }}
      />
      <Tab.Screen
        name="Assets"
        component={AssetsScreen}
        options={{ tabBarIcon: assetsIcon }}
      />
      <Tab.Screen
        name="Leads"
        component={LeadsScreen}
        options={{ tabBarIcon: leadsIcon }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
