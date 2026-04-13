import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  PhoneIconOutline,
  EmailIcon,
  CalendarNoteIcon,
  ReplayIcon,
} from '@/assets/images';

type NavProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropType = RouteProp<AppStackParamList, 'LeadDetails'>;

const LeadDetailsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();

  // Dummy lead data matching the Figma image
  const lead = {
    name: 'Amit Kumar',
    status: 'Qualified',
    phone: '+91 9876543210',
    email: 'amitkumar@example.com',
    company: 'ACNE-TECH',
    role: 'Sr. Purchasing Manager',
    activities: [
      {
        id: '1',
        type: 'Call',
        title: 'Logged Call',
        date: 'Yesterday, 2:00 PM',
        desc: '"Discussed pricing and contract duration for Q4."',
        iconBg: '#344EAD', // primary
      },
      {
        id: '2',
        type: 'Note',
        title: 'Note Added',
        date: 'Oct 24, 10:15 AM',
        desc: 'Prefers contact via email. Avoid calling before 10 AM.',
        iconBg: '#344EAD',
      },
      {
        id: '3',
        type: 'Status',
        title: 'Status Changed',
        date: 'Oct 20, 4:30 PM',
        desc: 'Moved from New to Qualified',
        iconBg: '#344EAD',
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <BackArrowIconBlack />
        </TouchableOpacity>
        <View style={styles.headerProfileContainer}>
          <Image
            source={{ uri: 'https://i.pravatar.cc/150?u=amit' }} // Dummy avatar
            style={styles.avatar}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{lead.name}</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{lead.status}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            const category = route.params?.category || 'Doctors'; // Default to Doctors if undefined
            if (category === 'Pharmacies') {
              navigation.navigate('AddPharmacyLead', { editMode: true, leadData: lead });
            } else {
              navigation.navigate('AddDoctorLead', { editMode: true, leadData: lead });
            }
          }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {[
            {
              icon: <PhoneIconOutline stroke={COLORS.white} height={18} width={18} />,
              label: 'CALL',
            },
            { icon: <EmailIcon stroke={COLORS.white} height={18} width={18} />, label: 'EMAIL' },
            {
              icon: <CalendarNoteIcon stroke={COLORS.white} height={18} width={18} />,
              label: 'NOTE',
            },
            { icon: <ReplayIcon height={18} width={18} />, label: 'STATUS' },
          ].map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton}>
              <View style={styles.iconWrapper}>
                <View style={styles.iconCircle}>{action.icon}</View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CONTACT INFO</Text>
          <View style={styles.infoRow}>
            <PhoneIconOutline stroke={COLORS.primary} width={20} height={20} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{lead.phone}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <EmailIcon stroke={COLORS.primary} width={20} height={20} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{lead.email}</Text>
            </View>
          </View>
        </View>

        {/* Company Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>COMPANY DETAILS</Text>
          <View style={styles.companyRow}>
            <Text style={styles.infoLabel}>Company:</Text>
            <Text style={styles.companyValue}>{lead.company}</Text>
          </View>
          <View style={styles.companyRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.companyValue}>{lead.role}</Text>
          </View>
        </View>

        {/* Activity Timeline */}
        <Text style={styles.timelineTitle}>ACTIVITY TIMELINE</Text>
        <View style={styles.timelineContainer}>
          {lead.activities.map((activity, index) => (
            <View key={activity.id} style={styles.timelineItem}>
              {/* Left Side: Timeline Line and Icon */}
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.timelineIconContainer,
                    { backgroundColor: activity.iconBg },
                  ]}
                >
                  {/* Depending on activity type, render different icons. Just using simple representations */}
                  {activity.type === 'Call' && (
                    <PhoneIconOutline
                      stroke={COLORS.white}
                      width={14}
                      height={14}
                    />
                  )}
                  {activity.type === 'Note' && (
                    <CalendarNoteIcon
                      stroke={COLORS.white}
                      width={14}
                      height={14}
                    />
                  )}
                  {activity.type === 'Status' && (
                    <ReplayIcon stroke={COLORS.white} width={14} height={14} />
                  )}
                </View>
                {/* Don't show line after the last item */}
                {index !== lead.activities.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Right Side: Activity Card */}
              <View style={styles.timelineCard}>
                <View style={styles.timelineCardHeader}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDate}>{activity.date}</Text>
                </View>
                {/* If the description has bold parts, we can render them differently, but for now just text */}
                <Text style={styles.activityDesc}>{activity.desc}</Text>
              </View>
            </View>
          ))}
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
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerProfileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.border,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  badgeContainer: {
    backgroundColor: '#E8EEF9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.medium,
    color: COLORS.primary,
  },
  editButtonText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    padding: 6,
  },
  iconWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  actionLabel: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#000',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
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
    color: COLORS.textSecondary,
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  companyValue: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
  },
  timelineTitle: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    color: '#000',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: 8,
  },
  timelineContainer: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 24,
  },
  timelineIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    width: 2,
    backgroundColor: COLORS.border,
    flex: 1,
    marginTop: -4,
    marginBottom: -20,
    zIndex: 0,
  },
  timelineCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#000',
  },
  activityDate: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  activityDesc: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});

export default LeadDetailsScreen;
