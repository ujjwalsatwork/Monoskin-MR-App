import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { MonoskinLogo, RightArrowIcon } from '@/assets/images';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { sendOtp } from '@/redux/slices/authSlice';

const BACKGROUND_IMAGE = require('@/assets/images/background/background.png');

const LoginScreen = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { otpLoading } = useSelector((state: RootState) => state.auth);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await dispatch(sendOtp({ phone: mobileNumber }));
    if (sendOtp.fulfilled.match(result)) {
      navigation.navigate('OTP', { mobileNumber });
    } else {
      const errorMsg =
        typeof result.payload === 'string'
          ? result.payload
          : 'Failed to send OTP';
      Alert.alert('Error', errorMsg);
    }
  };

  return (
    <ImageBackground
      source={BACKGROUND_IMAGE}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.logoContainer}>
          <MonoskinLogo />
        </View>
        <View style={styles.contentContainer}>

          <Text style={styles.title}>Welcome Medical{'\n'}Representative</Text>
          <Text style={styles.subtitle}>Safely access your pharmaceutical{'\n'}management dashboard</Text>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Mobile Number</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.countryCode}>+91</Text>
              <View style={styles.separator} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit number"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
                value={mobileNumber}
                onChangeText={setMobileNumber}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, otpLoading && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={otpLoading}
              activeOpacity={0.8}
            >
              {otpLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Send OTP</Text>
                  <RightArrowIcon />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* <View style={styles.footerContainer}>
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerText}> and </Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </View>
        </View> */}
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: COLORS.overlayAuth,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    flex: 1,
  },
  logoText: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  contentContainer: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    height: 56,
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  countryCode: {
    fontSize: FONTS.size.lg,
    color: COLORS.textDark,
    fontFamily: FONTS.family.semibold,
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: FONTS.size.lg,
    color: COLORS.textDark,
    fontFamily: FONTS.family.medium,
  },
  button: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
    marginRight: 8,
  },
  footerContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  footerText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
  },
  footerLinksRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  footerLink: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
