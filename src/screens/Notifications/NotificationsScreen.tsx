import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import {
  BackArrowIconBlack,
  DoctorBagIcon,
  Stack as StackIcon, // assuming Stack is the box
  Up as UpArrowIcon,
  InfoIcon,
  CalendarNoteIcon,
} from '@/assets/images';

type FilterType = 'All' | 'Visits' | 'Orders' | 'Targets';

type NotificationItem = {
  id: string;
  type: FilterType;
  title: string;
  description: string;
  time: string;
  isUnread: boolean;
  icon: React.ReactNode;
};

const DUMMY_DATA: NotificationItem[] = [
  {
    id: '1',
    type: 'Visits',
    title: 'Visit Scheduled: Dr. Smith',
    description: 'Appointment confirmed for today at 2:00 PM at City General Hospital.',
    time: '2M AGO',
    isUnread: true,
    icon: <DoctorBagIcon stroke={COLORS.primary} width={18} height={18} />,
  },
  {
    id: '2',
    type: 'Orders',
    title: 'Order Confirmed',
    description: '50 units of Amoxicillin for Apollo Pharmacy are processing for delivery.',
    time: '15M AGO',
    isUnread: true,
    icon: <StackIcon stroke={COLORS.primary} width={18} height={18} fill={COLORS.primary} />,
  },
  {
    id: 'header-1',
    type: 'All', // section header
    title: 'YESTERDAY',
    description: '',
    time: '',
    isUnread: false,
    icon: <View />,
  },
  {
    id: '3',
    type: 'Targets',
    title: 'Target Milestone Reached',
    description: 'Great job! You have achieved 80% of your weekly sales target.',
    time: 'Yesterday, 4:30 PM',
    isUnread: false,
    icon: <UpArrowIcon stroke={COLORS.primary} width={18} height={18} />,
  },
  {
    id: '4',
    type: 'Orders',
    title: 'Shipment Delayed',
    description: 'Order #9921 for Metro Pharma is delayed due to logistics issues.',
    time: 'Yesterday, 10:15 AM',
    isUnread: false,
    icon: <InfoIcon stroke={COLORS.primary} width={18} height={18} />,
  },
  {
    id: '5',
    type: 'Targets',
    title: 'New Monthly Target',
    description: 'Q4 Monthly Target has been assigned. Please review your dashboard.',
    time: 'Oct 24, 2023',
    isUnread: false,
    icon: <CalendarNoteIcon stroke={COLORS.primary} width={18} height={18} />,
  },
];

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  const filters: FilterType[] = ['All', 'Visits', 'Orders', 'Targets'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <TouchableOpacity
                key={filter}
                activeOpacity={0.8}
                style={[
                  styles.filterChip,
                  isActive ? styles.filterChipActive : styles.filterChipInactive,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    isActive ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {DUMMY_DATA.map((item) => {
          // If active filter is not 'All', hide items that don't match. Also hide headers.
          if (activeFilter !== 'All' && item.type !== activeFilter) {
            return null;
          }

          if (item.id.startsWith('header-')) {
            // Render section header
            if (activeFilter !== 'All') return null; // Headers only visible in 'All'
            return (
              <Text key={item.id} style={styles.sectionHeader}>
                {item.title}
              </Text>
            );
          }

          return (
            <View
              key={item.id}
              style={[
                styles.notificationCard,
                item.isUnread ? styles.unreadCard : styles.readCard,
              ]}
            >
              {item.isUnread && <View style={styles.unreadBorder} />}
              <View style={styles.iconCircle}>{item.icon}</View>
              <View style={styles.contentContainer}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text
                  style={[
                    styles.itemTime,
                    item.isUnread ? styles.unreadTime : styles.readTime,
                  ]}
                >
                  {item.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginLeft: 12,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  filterChipInactive: {
    borderColor: '#E8EDF1',
    backgroundColor: '#344EAD', // the image shows inactive is Blue! Wait!
    // Let's re-examine image: Active (All) is white bg with blue border. Inactive tags are solid blue with white text.
    // Yes! The unselected items "Visits, Orders, Targets" are blue pill shape with white text. "All" is white.
  },
  filterText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  filterTextInactive: {
    color: COLORS.white,
  },
  listContainer: {
    paddingBottom: 30,
  },
  sectionHeader: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  unreadCard: {
    backgroundColor: '#F7F9FB', // Light gray 
  },
  readCard: {
    backgroundColor: COLORS.white,
  },
  unreadBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: COLORS.primary,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // For Android
    marginRight: 16,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  itemTime: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
    textTransform: 'uppercase', // "2M AGO"
  },
  unreadTime: {
    color: COLORS.primary,
  },
  readTime: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.family.regular,
    textTransform: 'none',
  },
});

export default NotificationsScreen;
