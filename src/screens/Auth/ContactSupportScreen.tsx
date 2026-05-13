import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  ChatIcon,
  EmailIcon,
  PhoneIconOutline,
} from '@/assets/images';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ContactSupport'>;

const SUPPORT_EMAIL = 'support@monoskin.com';
const SUPPORT_PHONE = '+1-800-MONOSKIN';

const ContactSupportScreen = (_: Props) => {
  const handleStartChat = () => {
    Alert.alert('Live Chat', 'Connecting you to a support specialist...');
  };

  const handleSendEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Support Request`).catch(() =>
      Alert.alert('Error', 'Unable to open email client.')
    );
  };

  const handleCallNow = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert('Error', 'Unable to initiate call.')
    );
  };

  return (
    <View style={styles.safeArea}>
      <Header title="Support" showBack showNotification showProfile />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero text */}
        <Text style={styles.title}>How can we help?</Text>
        <Text style={styles.subtitle}>
          Our support team is available 24/7 to help you manage your devices and resolve any technical issues.
        </Text>

        {/* Chat with Us */}
        <View style={styles.card}>
          <View style={styles.cardIconContainer}>
            <ChatIcon />
          </View>
          <Text style={styles.cardTitle}>Chat with Us</Text>
          <Text style={styles.cardSubtitle}>
            Instant support via live chat with our specialists.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartChat} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Start Chat</Text>
          </TouchableOpacity>
        </View>

        {/* Email Support */}
        <View style={styles.card}>
          <View style={styles.cardIconContainer}>
            <EmailIcon />
          </View>
          <Text style={styles.cardTitle}>Email Support</Text>
          <Text style={styles.cardSubtitle}>
            Send us a detailed message and we'll reply within 4h.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSendEmail} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Send Email</Text>
          </TouchableOpacity>
        </View>

        {/* Call Support */}
        <View style={styles.card}>
          <View style={styles.cardIconContainer}>
            <PhoneIconOutline />
          </View>
          <Text style={styles.cardTitle}>Call Support</Text>
          <Text style={styles.cardSubtitle}>
            Speak directly with an enterprise technician.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCallNow} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // Hero
  title: {
    fontSize: FONTS.size.xxl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 10,
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

  // Support card
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(52, 78, 173, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },

  // Buttons
  primaryButton: {
    backgroundColor: COLORS.buttonBlue,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
  },
  secondaryButton: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: COLORS.buttonBlue,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.semibold,
  },
});

export default ContactSupportScreen;
