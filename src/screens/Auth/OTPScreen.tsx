import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
  Image,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { MonoskinLogo, RightArrowIcon, BackArrowIcon } from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { verifyOtp, sendOtp, logout } from '@/redux/slices/authSlice';

const MR_ROLE = 'Medical Representative';

const BACKGROUND_IMAGE = require('@/assets/images/background/background.png');

// Memoized Timer Component to prevent full screen re-renders on timer change
interface TimerDisplayProps {
  minutes: string;
  seconds: string;
}

const TimerDisplay = React.memo(({ minutes, seconds }: TimerDisplayProps) => (
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
));

// Memoized OTP Input Component to isolate re-renders
interface OTPInputsProps {
  otp: string[];
  onOtpChange: (text: string, index: number) => void;
  onKeyPress: (e: any, index: number) => void;
  inputRefs: React.MutableRefObject<(TextInput | null)[]>;
}

const OTPInputs = React.memo(({ otp, onOtpChange, onKeyPress, inputRefs }: OTPInputsProps) => (
  <View style={styles.otpContainer}>
    {otp.map((digit, index) => (
      <TextInput
        // @ts-ignore - key prop is valid for lists
        key={index}
        style={styles.otpInput}
        value={digit}
        onChangeText={text => onOtpChange(text, index)}
        onKeyPress={e => onKeyPress(e, index)}
        keyboardType="numeric"
        maxLength={1}
        ref={ref => {
          if (ref) {
            inputRefs.current[index] = ref;
          }
        }}
      />
    ))}
  </View>
));

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

const OTPScreen = ({ route, navigation }: Props) => {
  const { mobileNumber } = route.params || { mobileNumber: '' };
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(59);
  const [isScreenFocused, setIsScreenFocused] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const intervalRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { verifyLoading, otpLoading, otpFallback } = useSelector(
    (state: RootState) => state.auth,
  );

  // Track screen focus to control timer
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  // Fixed timer logic: only start when screen is focused
  useEffect(() => {
    if (!isScreenFocused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval only when screen is focused
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isScreenFocused]);

  const handleOtpChange = useCallback((text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }
    const result = await dispatch(
      verifyOtp({ phone: mobileNumber, otp: otpValue }),
    );
    if (verifyOtp.fulfilled.match(result)) {
      if (result.payload.role !== MR_ROLE) {
        dispatch(logout());
        Alert.alert(
          'Access Denied',
          'No MR found with this account.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }],
          { cancelable: false },
        );
        return;
      }
      navigation.navigate('DeviceBinding');
    } else {
      const errorMsg =
        typeof result.payload === 'string'
          ? result.payload
          : 'OTP verification failed';
      Alert.alert('Error', errorMsg);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  }, [otp, mobileNumber, dispatch, navigation]);

  const handleResend = useCallback(async () => {
    if (timer > 0) return;
    const result = await dispatch(sendOtp({ phone: mobileNumber }));
    if (sendOtp.fulfilled.match(result)) {
      setTimer(59);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      const errorMsg =
        typeof result.payload === 'string'
          ? result.payload
          : 'Failed to resend OTP';
      Alert.alert('Error', errorMsg);
    }
  }, [timer, mobileNumber, dispatch]);

  const formatTimer = useCallback((time: number) => {
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    return { minutes, seconds };
  }, []);

  const maskedNumber =
    '+91 ' + mobileNumber.slice(0, 2) + '•••••' + mobileNumber.slice(-3);
  const { minutes, seconds } = formatTimer(timer);
  const isLoading = verifyLoading || otpLoading;

  return (
    <View style={styles.rootContainer} renderToHardwareTextureAndroid needsOffscreenAlphaCompositing>
      <Image
        source={BACKGROUND_IMAGE}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      <KeyboardAwareScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollContentContainer}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'android' ? 100 : 0}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackArrowIcon />
        </TouchableOpacity>

        <View style={styles.logoContainer}>
          <MonoskinLogo />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.iconContainer} />

          <Text style={styles.title}>Verify Your Mobile{'\n'}Number</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to your registered{'\n'}
            mobile number <Text style={styles.boldText}>{maskedNumber}</Text>
          </Text>

          <OTPInputs
            otp={otp}
            onOtpChange={handleOtpChange}
            onKeyPress={handleKeyPress}
            inputRefs={inputRefs}
          />

          {otpFallback ? (
            <Text style={styles.otpFallbackText}>Dev OTP: {otpFallback}</Text>
          ) : null}

          <TimerDisplay minutes={minutes} seconds={seconds} />

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={timer > 0 || otpLoading}
            >
              {otpLoading ? (
                <ActivityIndicator
                  color={COLORS.white}
                  size="small"
                  style={styles.resendLoader}
                />
              ) : (
                <Text
                  style={[
                    styles.resendLink,
                    timer > 0 && styles.resendDisabled,
                  ]}
                >
                  Resend
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {verifyLoading ? (
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
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#001C68',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 24,
    zIndex: 10,
    padding: 8,
    marginLeft: -8,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logoText: {
    fontSize: FONTS.size.xxxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
    marginLeft: 8,
    letterSpacing: -0.5,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    minHeight: 400,
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
    marginBottom: 12,
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
  otpFallbackText: {
    color: 'rgba(255,255,200,0.85)',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    marginBottom: 12,
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
  timerBoxView: {
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
    alignItems: 'center',
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
  resendLoader: {
    marginLeft: 4,
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
    paddingBottom: 20,
    paddingTop: 20,
  },
  footerText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    letterSpacing: 0.5,
  },
});

export default OTPScreen;
