import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuth';
import { 
  RightArrowIcon, 
  BackArrowIcon, 
  PhoneSmallIcon, 
  FingerprintIcon,
  MonoskinLogo
} from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';
import { getDeviceName, getUniqueId } from 'react-native-device-info';

type Props = NativeStackScreenProps<AuthStackParamList, 'DeviceBinding'>;

const DeviceBindingScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState(false);
  const [deviceName, setDeviceName] = useState('Loading...');
  const [deviceId, setDeviceId] = useState('Loading...');
  const { login } = useAuth();

  useEffect(() => {
    const fetchDeviceInfo = async () => {
      try {
        const name = await getDeviceName();
        const id = await getUniqueId();
        setDeviceName(name);
        setDeviceId(id);
      } catch {
        setDeviceName('Unknown Device');
        setDeviceId('Unknown ID');
      }
    };
    fetchDeviceInfo();
  }, []);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 1500));
      // Log the user in fully after device is bound
      await login('tester@example.com', 'dummy_pass');
    } catch {
      Alert.alert('Error', 'Device binding failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotMyDevice = () => {
     Alert.alert('Security Alert', 'Please contact support to resolve this issue.', [
         { text: 'OK', onPress: () => navigation.goBack() }
     ]);
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
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <BackArrowIcon />
        </TouchableOpacity>

        {/* <MonoskinLogo /> */}
        <View style={styles.logoContainer}>
          <MonoskinLogo />
        </View>


        <View style={styles.contentContainer}>
          <Text style={styles.title}>Device Detected</Text>
          <Text style={styles.subtitle}>
              Please verify the details below to link this device to{'\n'}
              your MR account. This action ensures secure{'\n'}
              access to medical records.
          </Text>

          <View style={styles.card}>
             <View style={styles.cardContent}>
                 <View style={styles.row}>
                     <View style={styles.smallIconContainer}>
                         <PhoneSmallIcon />
                     </View>
                     <View style={styles.textWrapper}>
                         <Text style={styles.label}>DEVICE NAME</Text>
                         <Text style={styles.value}>{deviceName}</Text>
                     </View>
                 </View>
                 <View style={styles.divider} />
                 <View style={styles.row}>
                     <View style={styles.smallIconContainer}>
                         <FingerprintIcon />
                     </View>
                     <View style={styles.textWrapper}>
                         <Text style={styles.label}>DEVICE ID</Text>
                         <Text style={styles.value}>{deviceId}</Text>
                     </View>
                 </View>
             </View>
             <View style={styles.cardFooter}>
                 <View style={styles.greenDot} />
                 <Text style={styles.footerText}>SECURE CONNECTION VERIFIED</Text>
             </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.buttonText}>Confirm & Bind Device</Text>
                <RightArrowIcon />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomLinkContainer}>
            <TouchableOpacity onPress={handleNotMyDevice}>
                <Text style={styles.notMyDeviceText}>Not my device?</Text>
            </TouchableOpacity>
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
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
    padding: 8,
    marginLeft: -8,
  },
  contentContainer: {
    flex: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
    marginTop: 20,
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
  card: {
    backgroundColor: COLORS.white,
    width: '100%',
    borderRadius: 12,
    marginBottom: 32,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 80, 178, 0.08)', // Light blue background for icons
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    marginLeft: 16,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    marginBottom: 4,
  },
  value: {
    color: COLORS.textDark,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 16,
  },
  cardFooter: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#388E3C', // Success green
    marginRight: 8,
  },
  footerText: {
    color: '#666666',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.5,
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
  bottomLinkContainer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 20,
  },
  notMyDeviceText: {
    color: COLORS.white,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
  },
});

export default DeviceBindingScreen;
