import React, { useCallback, useEffect, useState } from 'react';
import DeviceInfo from 'react-native-device-info';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  Alert,
} from 'react-native';
import Config from 'react-native-config';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import {
  ProfileIcon,
  CheckCircleIcon,
  CalendarNoteIcon,
  EmailIcon,
  PhoneSmallIcon,
  CenterLocationIcon,
  CoffeeIcon,
  PauseIcon,
  PlayBlue,
} from '@/assets/images';
import { useAuth } from '@/hooks/useAuth';
import Svg, { Path } from 'react-native-svg';
import { fetchMyProfile } from '@/redux/slices/profileSlice';
import {
  fetchTodayStatus,
  startBreak,
  endBreak,
} from '@/redux/slices/attendanceSlice';
import { formatDurationSeconds, formatElapsedSeconds } from '@/utils/attendanceFormatter';
import { RootState } from '@/redux/rootReducer';
import { AppDispatch } from '@/redux/store';
import apiClient from '@/services/apiClient';

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

const RupeeListIcon = ({ color = COLORS.primary }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 3h12M6 8h12M6 13l8.5 8M6 13h3c3.5 0 5.5-1.5 5.5-4.5S12.5 5 9 5H6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}

const StatCard = ({ icon, value, label }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrapper}>{icon}</View>
    <Text style={styles.statPrimary}>{value}</Text>
    <Text style={styles.statSubtitle}>{label}</Text>
  </View>
);

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { logout } = useAuth();

  const { data: profile, isLoading, error } = useSelector(
    (state: RootState) => state.profile,
  );

  const {
    isCheckedIn,
    breakLoading,
    currentSession,
    activeBreak,
    breaks,
  } = useSelector((state: RootState) => state.attendance);

  const [approvedMonthlyTotal, setApprovedMonthlyTotal] = useState<number | null>(null);
  const [appVersion, setAppVersion] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [breakElapsed, setBreakElapsed] = useState(0);

  const fetchMonthlyExpense = useCallback(async (mrId: number) => {
    const now = new Date();
    try {
      const { data } = await apiClient.get<
        { expenseDate: string; totalAmount: string; status: string }[]
      >(`/mrs/${mrId}/expenses`);
      const total = data
        .filter(e => {
          if (e.status !== 'Approved') return false;
          const d = new Date(e.expenseDate);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, e) => sum + parseFloat(e.totalAmount), 0);
      setApprovedMonthlyTotal(total);
    } catch {
      setApprovedMonthlyTotal(null);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchMyProfile());
  }, [dispatch]);

  useEffect(() => {
    setAppVersion(DeviceInfo.getVersion());
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    fetchMonthlyExpense(profile.id);
  }, [profile?.id, fetchMonthlyExpense]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await dispatch(fetchMyProfile()).unwrap();
      if (result?.id) await fetchMonthlyExpense(result.id);
      dispatch(fetchTodayStatus());
    } catch {
      // errors are reflected in the profile slice / expense state
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, fetchMonthlyExpense]);

  // ─── Break timer ──────────────────────────────────────────────────────────
  // Keep today's attendance/break state fresh whenever the profile is focused.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchTodayStatus());
    }, [dispatch]),
  );

  useEffect(() => {
    if (!activeBreak) {
      setBreakElapsed(0);
      return;
    }
    const start = dayjs(activeBreak.breakStart);
    const tick = () => setBreakElapsed(dayjs().diff(start, 'second'));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeBreak]);

  const handleStartBreak = useCallback(async () => {
    if (!currentSession) return;
    const result = await dispatch(startBreak({ attendanceId: currentSession.id }));
    if (startBreak.rejected.match(result)) {
      Alert.alert('Break Failed', result.payload?.message ?? 'Failed to start break');
    }
  }, [dispatch, currentSession]);

  const handleEndBreak = useCallback(async () => {
    if (!activeBreak) return;
    const result = await dispatch(endBreak({ breakId: activeBreak.id }));
    if (endBreak.rejected.match(result)) {
      Alert.alert('Break Failed', result.payload?.message ?? 'Failed to end break');
    }
  }, [dispatch, activeBreak]);

  // Compute from timestamps for second-level precision (backend `duration` is rounded minutes)
  const totalBreakSeconds = breaks.reduce((sum, b) => {
    if (!b.breakEnd) return sum;
    return sum + dayjs(b.breakEnd).diff(dayjs(b.breakStart), 'second');
  }, 0);

  const conversionRate =
    profile && profile.leadsAssigned > 0
      ? Math.round((profile?.conversions / profile?.leadsAssigned) * 100)
      : 0;

  const hqLocation =
    profile?.territory && profile?.region
      ? `${profile.territory}, ${profile.region}`
      : profile?.territory ?? profile?.region ?? '—';

  return (
    <View style={styles.container}>
      <Header title="My Profile" showBack showNotification />

      {isLoading && !profile ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : error && !profile ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                {profile?.profilePhoto ? (
                  <Image
                    source={{ uri: `${Config.BASE_URL}${profile.profilePhoto}` }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <ProfileIcon width={100} height={100} />
                )}
              </View>

            </View>

            <Text style={styles.userName}>{profile?.name ?? '—'}</Text>
            <View style={styles.roleRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {profile?.role ?? 'MR'}
                </Text>
              </View>
              <Text style={styles.employeeIdInfo}>
                ID: {profile?.employeeId ?? '—'}
              </Text>
            </View>
          </View>

          {/* Statistics Cards — 2×2 grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard
                icon={<CheckCircleIcon stroke={COLORS.success} width={22} height={22} />}
                value={`${conversionRate}%`}
                label="Target Achieved"
              />
              <StatCard
                icon={<CalendarNoteIcon stroke={COLORS.primary} width={22} height={22} />}
                value={profile?.sampleAllocation ?? 0}
                label="Sample Allocation"
              />
            </View>
            <View style={styles.statsRow}>
              <StatCard
                icon={<RupeeListIcon color={COLORS.accent} />}
                value={approvedMonthlyTotal !== null ? `₹${approvedMonthlyTotal.toFixed(2)}` : '—'}
                label="Monthly Expense Summary"
              />
              <StatCard
                icon={<CenterLocationIcon width={22} height={22} fill={COLORS.primary} stroke={COLORS.primary} />}
                value={profile?.conversions ?? 0}
                label="Total Visits"
              />
            </View>
          </View>

          {/* Edit Profile + Expense Management */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.expenseButton, styles.actionRowBtn]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <Text style={styles.expenseButtonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.expenseButton, styles.actionRowBtn]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('ExpenseManagement')}
            >
              <Text style={styles.expenseButtonText}>Expense Management</Text>
            </TouchableOpacity>
          </View>

          {/* View Attendance History */}
          <TouchableOpacity
            style={[styles.outlineButton, styles.viewHistoryButton]}
            onPress={() => navigation.navigate('AttendanceHistory')}
            activeOpacity={0.8}
          >
            <Text style={styles.outlineButtonText}>View Attendance History</Text>
          </TouchableOpacity>

          {/* Personal Info */}
          <View style={styles.personalInfoSection}>
            <Text style={styles.sectionTitle}>PERSONAL INFO</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <EmailIcon width={18} height={18} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profile?.email ?? '—'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <PhoneSmallIcon width={18} height={18} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{profile?.phone ?? '—'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <CenterLocationIcon width={18} height={18} fill="#A0ABBB" stroke="#A0ABBB" />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>HQ Location</Text>
                  <Text style={styles.infoValue}>{hqLocation}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Support & Contacts Info */}
          <View style={styles.personalInfoSection}>
            <Text style={styles.sectionTitle}>SUPPORT</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <PhoneSmallIcon width={18} height={18} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Helpline</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:+917400900852')}>
                    <Text style={[styles.infoValue, { color: COLORS.primary, textDecorationLine: 'underline' }]}>+91 74009 00852</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <PhoneSmallIcon width={18} height={18} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>HR - Pooja Khandelwal</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:+917500610020')}>
                    <Text style={[styles.infoValue, { color: COLORS.primary, textDecorationLine: 'underline' }]}>+91 75006 10020</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <PhoneSmallIcon width={18} height={18} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Finance - Chetan Kannojiya</Text>
                  <TouchableOpacity onPress={() => Linking.openURL('tel:+916268993566')}>
                    <Text style={[styles.infoValue, { color: COLORS.primary, textDecorationLine: 'underline' }]}>+91 62689 93566</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>


          {/* Break Timer */}
          <View style={styles.breakSection}>
            <View style={styles.breakCard}>
              <View style={styles.breakLeft}>
                <View style={styles.breakIconContainer}>
                  <CoffeeIcon />
                </View>
                <View>
                  <Text style={styles.breakTitle}>Break Timer</Text>
                  {activeBreak ? (
                    <Text style={styles.breakTimer}>
                      {formatElapsedSeconds(breakElapsed)}
                    </Text>
                  ) : (
                    <Text style={styles.breakSubtitle}>
                      Log lunch breaks or{'\n'}transport gaps
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.breakButton,
                  (!isCheckedIn || breakLoading) && styles.buttonDisabled,
                ]}
                onPress={activeBreak ? handleEndBreak : handleStartBreak}
                disabled={!isCheckedIn || breakLoading}
                activeOpacity={0.8}
              >
                {breakLoading ? (
                  <ActivityIndicator size="small" color={COLORS.buttonBlue} />
                ) : activeBreak ? (
                  <PlayBlue />
                ) : (
                  <PauseIcon />
                )}
                <Text style={styles.breakButtonText}>
                  {activeBreak ? 'END\nBREAK' : 'START\nBREAK'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Break Summary */}
            {(breaks.length > 0 || activeBreak !== null) && (
              <View style={styles.breakSummaryCard}>
                <View style={styles.breakSummaryRow}>
                  <View style={styles.breakSummaryStat}>
                    <Text style={styles.breakSummaryLabel}>BREAKS TODAY</Text>
                    <Text style={styles.breakSummaryValue}>
                      {breaks.length + (activeBreak ? 1 : 0)}
                    </Text>
                  </View>
                  <View style={styles.breakSummaryStat}>
                    <Text style={styles.breakSummaryLabel}>TOTAL BREAK</Text>
                    <Text style={styles.breakSummaryValue}>
                      {formatDurationSeconds(totalBreakSeconds)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Submit Leave Request */}
          <TouchableOpacity
            style={[styles.outlineButton, styles.leaveRequestButton]}
            onPress={() => navigation.navigate('SubmitLeave')}
            activeOpacity={0.8}
          >
            <Text style={styles.leaveRequestButtonText}>Submit Leave Request</Text>
          </TouchableOpacity>


          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={logout}>
            <LogoutIconUI stroke="#E44B4B" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Version: v{appVersion}</Text>
        </ScrollView>
      )}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: '#E44B4B',
    textAlign: 'center',
    paddingHorizontal: 24,
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
    borderColor: '#4263EB',
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4263EB',
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

  // Statistics Grid
  statsGrid: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statPrimary: {
    fontSize: 22,
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
    marginBottom: 24,
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
    backgroundColor: '#F0F4FF',
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
    marginLeft: 72,
  },

  // Action row (side-by-side buttons)
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  actionRowBtn: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },

  // Expense Management Button
  expenseButton: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.primary,
    height: 40,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseButtonText: {
    color: COLORS.white,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
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
  versionText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: '#B0B8C4',
  },

  // ── Outline buttons (View History / Submit Leave) ──────────────────────
  outlineButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  outlineButtonText: {
    color: COLORS.primary,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
  },
  viewHistoryButton: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.45,
  },

  // ── Break timer ────────────────────────────────────────────────────────
  breakSection: {
    marginBottom: 24,
  },
  breakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  breakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(46, 80, 178, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  breakTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    marginBottom: 2,
  },
  breakSubtitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  breakTimer: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    marginTop: 2,
  },
  breakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  breakButtonText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
    textAlign: 'center',
    lineHeight: 14,
  },
  breakSummaryCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8F9FF',
  },
  breakSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakSummaryStat: {
    alignItems: 'center',
    flex: 1,
  },
  breakSummaryLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  breakSummaryValue: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#000',
    textAlign: 'center',
  },

  // ── Submit Leave Request ───────────────────────────────────────────────
  leaveRequestButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderColor: COLORS.buttonBlue,
  },
  leaveRequestButtonText: {
    color: COLORS.buttonBlue,
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
  },
});

export default ProfileScreen;
