import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  NotificationIcon,
  ProfileIcon,
  FingerprintIcon,
  InfoIcon,
  CheckCircleIcon,
} from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'UnbindSuccess'>;

const UnbindSuccessScreen = ({ navigation, route }: Props) => {
  const { deviceName, deviceId, reason } = route.params;

  const handleReturnToHome = () => {
    navigation.navigate('DeviceBinding');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('DeviceBinding')}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Management</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <NotificationIcon />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <ProfileIcon />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerDivider} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Icon */}
        <View style={styles.successIconContainer}>
          <View style={styles.successCircle}>
             <CheckCircleIcon />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Request Sent Successfully</Text>
        <Text style={styles.subtitle}>
          Your unbind request for this device has been submitted and is currently being processed by the administration.
        </Text>

        {/* Device Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>DEVICE INFORMATION</Text>
          <View style={styles.cardDivider} />
          <View style={styles.deviceRow}>
            <View style={styles.deviceTextBlock}>
              <Text style={styles.deviceName}>{deviceName}</Text>
              <View style={styles.deviceIdRow}>
                <FingerprintIcon />
                <Text style={styles.deviceId}> ID: {deviceId}</Text>
              </View>
            </View>
            <View style={styles.deviceWatermark}>
              <View style={styles.watermarkSquare} />
              <View style={styles.watermarkSquareOffset} />
            </View>
          </View>
        </View>

        {/* Reason Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardLabel}>REASON FOR REQUEST</Text>
          <View style={styles.cardDivider} />
          <Text style={styles.reasonText}>{reason}</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Status: Pending Review</Text>
          </View>
        </View>

        {/* Return to Home Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReturnToHome}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Return to Home</Text>
        </TouchableOpacity>

        {/* What happens next card */}
        <View style={styles.nextStepsCard}>
          <View style={styles.nextStepsIconContainer}>
            <InfoIcon />
          </View>
          <Text style={styles.nextStepsTitle}>What happens next?</Text>
          <Text style={styles.nextStepsBody}>
            The unbinding process typically takes 24-48 business hours. You will receive a notification once the status has been updated. You can track this in your Support dashboard.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Success icon
  successIconContainer: {
    marginBottom: 20,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 36,
    fontFamily: FONTS.family.bold,
    lineHeight: 42,
  },

  // Title / subtitle
  title: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  // Info cards
  infoCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceTextBlock: {
    flex: 1,
  },
  deviceName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 6,
  },
  deviceIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceId: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  deviceWatermark: {
    width: 48,
    height: 48,
    position: 'relative',
    opacity: 0.08,
  },
  watermarkSquare: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 3,
    borderColor: COLORS.buttonBlue,
    borderRadius: 4,
    top: 0,
    left: 0,
  },
  watermarkSquareOffset: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 3,
    borderColor: COLORS.buttonBlue,
    borderRadius: 4,
    top: 10,
    left: 10,
  },
  reasonText: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.buttonBlue,
    marginRight: 8,
  },
  statusText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  // Primary button
  primaryButton: {
    backgroundColor: COLORS.buttonBlue,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
  },

  // What happens next
  nextStepsCard: {
    width: '100%',
    backgroundColor: '#F0F2F8',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  nextStepsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  nextStepsTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  nextStepsBody: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default UnbindSuccessScreen;
