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

const LoginScreen = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      // Simulate network delay for OTP sending and auto-verification
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      // Navigate to OTP Screen
      navigation.navigate('OTP', { mobileNumber });
    } catch {
      Alert.alert('Error', 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={{ uri: '/Users/menttechlabs/Documents/Nimish/Monoskin-MR-App/src/assets/images/background/background.png' }} 
      style={styles.backgroundImage}
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
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSendOTP}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
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

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
          <View style={styles.footerLinksRow}>
            <Text style={styles.footerLink}>Terms of Service</Text>
            <Text style={styles.footerText}> and </Text>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </View>
        </View>
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
    backgroundColor: COLORS.overlayAuth, // Matches the dark blue-ish tint in the original design
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
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
    backgroundColor: COLORS.buttonBlue, // Match the solid blue from the design
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
