import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Platform,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { SearchIcon, PhoneIconOutline, EmailIcon } from '@/assets/images';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';

type NavProp = NativeStackNavigationProp<AppStackParamList>;

/* ─── Types & Data ───────────────────────────────────────────────── */
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED';
type Priority = 'High Priority' | 'Med Priority' | 'Low Priority';

type Lead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  priority: Priority;
  lastContact: string;
  category: 'Doctors' | 'Pharmacies';
};

const LEADS: Lead[] = [
  { id: '1', name: 'Amit Kumar', company: 'Acme Corp',           status: 'NEW',       priority: 'High Priority', lastContact: '2h ago', category: 'Doctors' },
  { id: '2', name: 'Amit Kumar', company: 'Globex International', status: 'CONTACTED', priority: 'Med Priority',  lastContact: 'Yesterday', category: 'Doctors' },
  { id: '3', name: 'Amit Kumar', company: 'TechFlow Systems',    status: 'QUALIFIED',  priority: 'High Priority', lastContact: '3 days ago', category: 'Doctors' },
  { id: '4', name: 'Amit Kumar', company: 'Summit Agency',       status: 'CONVERTED',  priority: 'Low Priority',  lastContact: 'Oct 12', category: 'Doctors' },
  { id: '5', name: 'City Health Pharma', company: 'Acme Corp',   status: 'NEW',       priority: 'High Priority', lastContact: '2h ago', category: 'Pharmacies' },
  { id: '6', name: 'Wellness Apothecary', company: 'Globex',     status: 'CONTACTED', priority: 'Med Priority',  lastContact: 'Yesterday', category: 'Pharmacies' },
];

const STATUS_CONFIG: Record<LeadStatus, { bg: string; color: string }> = {
  NEW:       { bg: '#F0F0F0', color: '#666666' },
  CONTACTED: { bg: '#E8EEF9', color: COLORS.buttonBlue },
  QUALIFIED: { bg: '#FFF3E0', color: '#E65100' },
  CONVERTED: { bg: '#E8F5E9', color: '#2E7D32' },
};

const PRIORITY_CONFIG: Record<Priority, { bg: string; color: string }> = {
  'High Priority': { bg: '#FDECEA', color: '#C62828' },
  'Med Priority':  { bg: '#FFF3E0', color: '#E65100' },
  'Low Priority':  { bg: '#F0F0F0', color: '#666666' },
};

/* ─── Lead Card ──────────────────────────────────────────────────── */
const LeadCard = ({ item }: { item: Lead }) => {
  const status = STATUS_CONFIG[item.status];
  const priority = PRIORITY_CONFIG[item.priority];
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.leadName}>{item.name}</Text>
          <Text style={styles.leadCompany}>{item.company}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{item.status}</Text>
        </View>
      </View>

      {/* Priority + Last contact */}
      <View style={styles.metaRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{item.priority}</Text>
        </View>
        <Text style={styles.dot}> • </Text>
        <Text style={styles.lastContact}>Last contact: {item.lastContact}</Text>
      </View>

      <View style={styles.divider} />

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <View style={styles.iconBtns}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <PhoneIconOutline width={20} height={20} stroke={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8}>
            <EmailIcon width={20} height={20} stroke={COLORS.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity activeOpacity={0.7} onPress={() => {
          navigation.navigate('LeadDetails', { leadId: item.id, category: item.category });
        }}>
          <Text style={styles.detailsLink}>Details {'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Screen ─────────────────────────────────────────────────────── */
/* ─── Screen ─────────────────────────────────────────────────────── */
const LeadsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Doctors' | 'Pharmacies'>('Doctors');

  const filtered = LEADS.filter(l =>
    (l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.company.toLowerCase().includes(search.toLowerCase())) &&
    l.category === activeTab
  );

  return (
    <View style={styles.container}>
      <Header title="Lead CRM" showBack showNotification showProfile />

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <SearchIcon />
          <TextInput
            style={styles.searchInput}
            placeholder="Search leads by name or area..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Doctors' && styles.tabButtonActive]} 
            activeOpacity={0.8}
            onPress={() => setActiveTab('Doctors')}
          >
            <Text style={[styles.tabText, activeTab === 'Doctors' && styles.tabTextActive]}>Doctors</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'Pharmacies' && styles.tabButtonActive]} 
            activeOpacity={0.8}
            onPress={() => setActiveTab('Pharmacies')}
          >
            <Text style={[styles.tabText, activeTab === 'Pharmacies' && styles.tabTextActive]}>Pharmacies</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <LeadCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Fixed Bottom Button */}
      <View style={styles.fixedBottomContainer}>
        <Text style={styles.addTitle}>ADD LEADS</Text>
        <TouchableOpacity 
          style={styles.addBtn} 
          activeOpacity={0.85} 
          onPress={() => activeTab === 'Doctors' ? navigation.navigate('AddDoctorLead') : navigation.navigate('AddPharmacyLead')}
        >
          <Text style={styles.addBtnText}>
            {activeTab === 'Doctors' ? '+ Add Doctor Leads' : '+ Add Pharmacy Leads'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    padding: 0,
  },

  listContent: { paddingHorizontal: 16, gap: 14, paddingBottom: 24 },

  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleBlock: { flex: 1, marginRight: 8 },
  leadName: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 2,
  },
  leadCompany: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.4,
  },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priorityText: { fontSize: FONTS.size.xs, fontFamily: FONTS.family.semibold },
  dot: { color: COLORS.textMuted, fontSize: FONTS.size.sm },
  lastContact: {
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    color: COLORS.textSecondary,
  },

  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 12 },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBtns: { flexDirection: 'row', gap: 10 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.buttonBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsLink: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.buttonBlue,
  },

  tabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 28,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 24,
  },
  tabButtonActive: {
    backgroundColor: COLORS.buttonBlue,
  },
  tabText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },

  fixedBottomContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addTitle: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    letterSpacing: 0.4,
    marginBottom: 12,
  },
  addBtn: {
    backgroundColor: COLORS.buttonBlue,
    borderRadius: 28,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDark: { backgroundColor: '#1E3A8A' },
  addBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default LeadsScreen;
