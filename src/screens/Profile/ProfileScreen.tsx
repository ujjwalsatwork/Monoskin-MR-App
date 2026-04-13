import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  ProfileIcon,
  Camera,
  CheckCircleIcon,
  CalendarNoteIcon,
  EmailIcon,
  PhoneSmallIcon,
  CenterLocationIcon, // generic location
} from '@/assets/images';
import { useAuth } from '@/hooks/useAuth';
import Svg, { Path } from 'react-native-svg';

// Custom Logout Icon matching the design context
const LogoutIconUI = ({ stroke = '#FF4D4F' }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H15M10 17L15 12L10 7M15 12H3"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { logout } = useAuth(); // keep auth hook

  return (
    <View style={styles.container}>
      {/* Native Header Hook */}
      <Header title="My Profile" showBack showNotification />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              <ProfileIcon width={100} height={100} />
            </View>
            <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.8}>
              <Camera width={16} height={16} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>Amit Kumar</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>SENIOR MR</Text>
            </View>
            <Text style={styles.employeeIdInfo}>ID: MR-8829</Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircleIcon stroke={COLORS.success} width={20} height={20} />
              <Text style={styles.statValuePositive}>+5%</Text>
            </View>
            <Text style={styles.statPrimary}>85%</Text>
            <Text style={styles.statSubtitle}>Target Achieved</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CalendarNoteIcon stroke={COLORS.primary} width={20} height={20} />
              <Text style={styles.statValueNeutral}>This Month</Text>
            </View>
            <Text style={styles.statPrimary}>124</Text>
            <Text style={styles.statSubtitle}>Total Visits</Text>
          </View>
        </View>

        {/* Personal Info */}
        <View style={styles.personalInfoSection}>
          <Text style={styles.sectionTitle}>PERSONAL INFO</Text>

          <View style={styles.infoCard}>
            {/* Email Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <EmailIcon width={18} height={18} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>amit.k@example.com</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            {/* Phone Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <PhoneSmallIcon width={18} height={18} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>+91 98765 43210</Text>
              </View>
            </View>
            
            <View style={styles.divider} />

            {/* Location Row */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrapper}>
                <CenterLocationIcon width={18} height={18} fill="#A0ABBB" stroke="#A0ABBB" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>HQ Location</Text>
                <Text style={styles.infoValue}>Indore, Madhya Pradesh</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={logout}>
          <LogoutIconUI stroke="#E44B4B" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    paddingBottom: 40,
  },
  
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#4263EB', // prominent blue border
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4263EB', // solid blue fill matching border
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: '#111827',
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#4263EB',
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.5,
  },
  employeeIdInfo: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },

  // Statistics Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF1',
    // Shadow drops
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statValuePositive: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.success,
  },
  statValueNeutral: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.primary,
  },
  statPrimary: {
    fontSize: 24,
    fontFamily: FONTS.family.bold,
    color: '#111827',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },

  // Personal Info Section
  personalInfoSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EDF1',
    // Shadow drops
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7F9FB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EDF1',
    marginLeft: 72, // aligns with text
  },

  // Logout Button
  logoutButton: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F0',
    height: 56,
    borderRadius: 28,
    gap: 8,
  },
  logoutButtonText: {
    color: '#E44B4B',
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
  },
});

export default ProfileScreen;
