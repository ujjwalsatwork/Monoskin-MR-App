import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '@/screens/Auth/LoginScreen';
import OTPScreen from '@/screens/Auth/OTPScreen';
import DeviceBindingScreen from '@/screens/Auth/DeviceBindingScreen';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="DeviceBinding" component={DeviceBindingScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
