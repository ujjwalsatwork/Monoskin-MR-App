import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Platform, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import { SearchIcon, PhoneIconOutline, EmailIcon } from '@/assets/images';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import apiClient from '@/services/apiClient';

type NavProp = NativeStackNavigationProp<AppStackParamList>;

/* ─── Types ──────────────────────────────────────────────────────── */
type Lead = {
  id: number;
  name: string;
  clinic: string;
  city: string;
  phone: string | null;
  email: string | null;
  stage: string;
  priority: string;
  source: string | null;
  assignedMRId: number | null;
  nextFollowUp: string | null;
  createdAt: string;
};

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  New:         { bg: '#F0F0F0', color: '#666666' },
  Contacted:   { bg: '#E8EEF9', color: COLORS.buttonBlue },
  Qualified:   { bg: '#FFF3E0', color: '#E65100' },
  Proposal:    { bg: '#E8F5E9', color: '#2E7D32' },
  Negotiation: { bg: '#FDE8FF', color: '#7B1FA2' },
  'Sent to MR':{ bg: '#E3F2FD', color: '#1565C0' },
  Converted:   { bg: '#E8F5E9', color: '#2E7D32' },
  Lost:        { bg: '#FDECEA', color: '#C62828' },
};

const PRIORITY_COLORS: Record<string, { bg: string; color: string }> = {
  High:   { bg: '#FDECEA', color: '#C62828' },
  Medium: { bg: '#FFF3E0', color: '#E65100' },
  Low:    { bg: '#F0F0F0', color: '#666666' },
};

/* ─── Lead Card ──────────────────────────────────────────────────── */
const LeadCard = ({ item }: { item: Lead }) => {
  const stageStyle = STAGE_COLORS[item.stage] ?? { bg: '#F0F0F0', color: '#666666' };
  const priorityStyle = PRIORITY_COLORS[item.priority] ?? { bg: '#F0F0F0', color: '#666666' };
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.leadName}>{item.name}</Text>
          <Text style={styles.leadCompany}>{item.clinic || item.city || '—'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: stageStyle.bg }]}>
          <Text style={[styles.statusText, { color: stageStyle.color }]}>
            {item.stage.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Priority + city */}
      <View style={styles.metaRow}>
        <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={[styles.priorityText, { color: priorityStyle.color }]}>
            {item.priority} Priority
          </Text>
        </View>
        {item.city ? (
          <>
            <Text style={styles.dot}> • </Text>
            <Text style={styles.lastContact}>{item.city}</Text>
          </>
        ) : null}
      </View>

      <View style={styles.divider} />

      {/* Actions row */}
      <View style={styles.actionsRow}>
        <View style={styles.iconBtns}>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => item.phone && undefined /* tel link placeholder */}
          >
            <PhoneIconOutline width={20} height={20} stroke={COLORS.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            activeOpacity={0.8}
            onPress={() => item.email && undefined /* email link placeholder */}
          >
            <EmailIcon width={20} height={20} stroke={COLORS.white} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('LeadDetails', { leadId: String(item.id), category: 'Doctors' })}
        >
          <Text style={styles.detailsLink}>Details {'>'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/* ─── Screen ─────────────────────────────────────────────────────── */
const LeadsScreen = () => {
  const navigation = useNavigation<NavProp>();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'Doctors' | 'Pharmacies'>('Doctors');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await apiClient.get<Lead[]>('/leads');
      setLeads(res.data);
    } catch {
      // silently fail — list stays empty
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Refresh list every time this screen comes into focus (e.g. after adding a lead)
  useFocusEffect(
    useCallback(() => {
      fetchLeads();
    }, [fetchLeads])
  );

  const filteredDoctors = leads.filter(l => {
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.clinic || '').toLowerCase().includes(q) ||
      (l.city || '').toLowerCase().includes(q)
    );
  });

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
            <Text style={[styles.tabText, activeTab === 'Doctors' && styles.tabTextActive]}>
              Doctors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'Pharmacies' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('Pharmacies')}
          >
            <Text style={[styles.tabText, activeTab === 'Pharmacies' && styles.tabTextActive]}>
              Pharmacies
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'Doctors' ? (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.buttonBlue} />
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            keyExtractor={i => String(i.id)}
            renderItem={({ item }) => <LeadCard item={item} />}
            contentContainerStyle={[
              styles.listContent,
              filteredDoctors.length === 0 && styles.listEmpty,
            ]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLeads(true)}
                tintColor={COLORS.buttonBlue}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {search ? 'No leads match your search.' : 'No doctor leads yet. Add your first lead!'}
                </Text>
              </View>
            }
          />
        )
      ) : (
        /* Pharmacies tab — not yet implemented */
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Pharmacy leads coming soon.</Text>
        </View>
      )}

      {/* Fixed Bottom Button */}
      <View style={styles.fixedBottomContainer}>
        <Text style={styles.addTitle}>ADD LEADS</Text>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() =>
            activeTab === 'Doctors'
              ? navigation.navigate('AddDoctorLead')
              : navigation.navigate('AddPharmacyLead')
          }
        >
          <Text style={styles.addBtnText}>
            {activeTab === 'Doctors' ? '+ Add Doctor Lead' : '+ Add Pharmacy Lead'}
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
  listEmpty: { flex: 1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
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

  tabsContainer: { paddingHorizontal: 16, paddingBottom: 12 },
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
  tabButtonActive: { backgroundColor: COLORS.buttonBlue },
  tabText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.semibold,
    color: COLORS.textSecondary,
  },
  tabTextActive: { color: COLORS.white },

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
  addBtnText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.bold,
    color: COLORS.white,
  },
});

export default LeadsScreen;
