import React, { useState, useRef, useEffect } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { MonoskinLogo, RightArrowIcon, BackArrowIcon } from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';



type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTPScreen = ({ route, navigation }: Props) => {
  const { mobileNumber } = route.params;
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(59);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-advance
    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      // Navigate to DeviceBinding Screen upon successful OTP
      navigation.navigate('DeviceBinding');
    } catch {
      Alert.alert('Error', 'OTP Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(59);
      // Insert resend logic here
      Alert.alert('Success', 'OTP Resent!');
    }
  };

  const formatTimer = (time: number) => {
    const minutes = Math.floor(time / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return { minutes, seconds };
  };

  const maskedNumber = '+1 ••• ••• ' + mobileNumber.slice(-2);
  const { minutes, seconds } = formatTimer(timer);

  return (
    <ImageBackground
      source={{
        uri: '/Users/menttechlabs/Documents/Nimish/Monoskin-MR-App/src/assets/images/background/background.png',
      }}
      style={styles.backgroundImage}
    >
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackArrowIcon />
        </TouchableOpacity>

        {/* <MonoskinLogo /> */}
        <View style={styles.logoContainer}>
          <MonoskinLogo />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.iconContainer}>
            {/* <MobileVerificationIcon /> */}
          </View>

          <Text style={styles.title}>Verify Your Mobile{'\n'}Number</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to your registered{'\n'}
            mobile number <Text style={styles.boldText}>{maskedNumber}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                style={[styles.otpInput]}
                value={digit}
                onChangeText={text => handleOtpChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
              />
            ))}
          </View>

          <View style={styles.timerContainer}>
            <View style={styles.timerBoxView}>
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>{minutes}</Text>
              </View>
              <Text style={styles.timerLabel}>MINUTES</Text>
            </View>
              <Text style={styles.timerColon}>:</Text>
            <View style={styles.timerBoxView}>
              <View style={styles.timerBox}>
                <Text style={styles.timerText}>{seconds}</Text>
              </View>
              <Text style={styles.timerLabel}>SECONDS</Text>
            </View>
          </View>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
              <Text
                style={[styles.resendLink, timer > 0 && styles.resendDisabled]}
              >
                Resend
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Verify & Continue</Text>
                <RightArrowIcon />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            END-TO-END ENCRYPTED VERIFICATION
          </Text>
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlayAuth,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8, // Increase touch area
    marginLeft: -8,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
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
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  boldText: {
    fontFamily: FONTS.family.bold,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    backgroundColor: 'transparent',
    color: COLORS.white,
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.semibold,
    textAlign: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  timerBox: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    width: 50,
  },
  timerBoxView:{
    alignItems: 'center',
  },
  timerText: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
  },
  timerLabel: {
    color: COLORS.white,
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    bottom: -16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  timerColon: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    marginHorizontal: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  resendText: {
    color: COLORS.border,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
  },
  resendLink: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
  },
  resendDisabled: {
    opacity: 0.5,
  },
  button: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
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
    letterSpacing: 0.5,
  },
});

export default OTPScreen;
