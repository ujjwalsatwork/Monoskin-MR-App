import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BackArrowIconBlack, NotificationIcon, ProfileIcon } from '@/assets/images';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showNotification?: boolean;
  showProfile?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBack = false, 
  showNotification = false, 
  showProfile = false 
}) => {
  const navigation = useNavigation();

  return (
    <View style={styles.header}>
      {showBack && (
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <BackArrowIconBlack />
        </TouchableOpacity>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      
      <View style={styles.headerRight}>
        {showNotification && (
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Notifications' as never)}>
            <View>
              <NotificationIcon />
              <View style={styles.notificationDot} />
            </View>
          </TouchableOpacity>
        )}
        {showProfile && (
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Profile' as never)}>
            <ProfileIcon />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: FONTS.size.xl,
    fontFamily: FONTS.family.bold,
    color: '#000',
    flex: 1,
    marginLeft: 12,
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
  },
  notificationDot: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1,
    borderColor: '#FFF',
  },
});

export default Header;
