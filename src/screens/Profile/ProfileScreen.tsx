import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '@/constants/colors';
import { globalStyles } from '@/theme/globalStyles';
import { Button } from '@/components';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useAuth } from '@/hooks/useAuth';

const ProfileScreen = () => {
  const { info } = useSelector((state: RootState) => state.user);
  const { logout } = useAuth();

  return (
    <ScrollView style={globalStyles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{info?.name?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.userName}>{info?.name || 'User Name'}</Text>
        <Text style={styles.userRole}>{info?.role || 'Medical Representative'}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{info?.email || 'user@example.com'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Employee ID</Text>
          <Text style={styles.infoValue}>MR-8829</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Region</Text>
          <Text style={styles.infoValue}>North Sector</Text>
        </View>
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionText}>Help & Support</Text>
        </TouchableOpacity>
        <Button 
          title="Logout" 
          variant="outline" 
          onPress={logout} 
          style={styles.logoutBtn} 
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 40,
    color: COLORS.white,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  infoSection: {
    marginTop: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomColor: COLORS.border,
  },
  infoRow: {
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  actionSection: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  actionItem: {
    backgroundColor: COLORS.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    ...globalStyles.shadow,
  },
  actionText: {
    fontSize: 16,
    color: COLORS.text,
  },
  logoutBtn: {
    marginTop: 20,
    borderColor: COLORS.error,
  },
});

export default ProfileScreen;
