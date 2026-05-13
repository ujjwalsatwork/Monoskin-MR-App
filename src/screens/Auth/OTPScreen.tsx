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
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
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

// Isolated so timer ticks don't re-render the parent screen
interface ResendRowProps {
  minutes: string;
  seconds: string;
  timer: number;
  otpLoading: boolean;
  onResend: () => void;
}

const ResendRow = React.memo(({ minutes, seconds, timer, otpLoading, onResend }: ResendRowProps) => (
  <View style={styles.resendContainer}>
    <Text style={styles.resendText}>Didn't receive the code? </Text>
    {otpLoading ? (
      <ActivityIndicator color={COLORS.white} size="small" style={styles.resendLoader} />
    ) : timer > 0 ? (
      <Text style={styles.resendTimerText}>
        Resend in {minutes}:{seconds}
      </Text>
    ) : (
      <TouchableOpacity onPress={onResend}>
        <Text style={styles.resendLink}>Resend</Text>
      </TouchableOpacity>
    )}
  </View>
));

// Isolated to prevent full-screen re-renders when typing
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
  const [timerKey, setTimerKey] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);
  const intervalRef = useRef<any>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { verifyLoading, otpLoading, otpFallback } = useSelector(
    (state: RootState) => state.auth,
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!isScreenFocused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

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
  }, [isScreenFocused, timerKey]);

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
      setTimerKey(k => k + 1);
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
    <View style={styles.rootContainer}>
      <Image
        source={BACKGROUND_IMAGE}
        style={styles.backgroundImage}
      />
      <View style={styles.overlay} />

      <KeyboardAwareScrollView
        style={styles.scrollViewContainer}
        contentContainerStyle={styles.scrollContentContainer}
        enableOnAndroid={true}
        extraScrollHeight={-60}
        enableAutomaticScroll={true}
        enableResetScrollToCoords={false}
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

          <ResendRow
            minutes={minutes}
            seconds={seconds}
            timer={timer}
            otpLoading={otpLoading}
            onResend={handleResend}
          />

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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: 'rgba(0, 28, 104, 0.53)',
  },
  scrollViewContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 24,
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
    marginBottom: 16,
    marginTop: 24,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
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
    lineHeight: 22,
    marginBottom: 24,
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
    marginBottom: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.border,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
  },
  resendTimerText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
  },
  resendLink: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
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
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 'auto',
  },
  footerText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    letterSpacing: 0.5,
  },
});

export default OTPScreen;
