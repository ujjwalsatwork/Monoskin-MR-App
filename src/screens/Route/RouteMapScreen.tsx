import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { FONTS } from '@/constants/fonts';
import {
  SendArrowIcon,
  PhoneIconOutline,
  CenterLocationIcon,
  LayersIcon,
} from '@/assets/images';
import BackArrowIcon from '@/assets/images/BackArrowIcon.svg';
import MapPinOutlineIcon from '@/assets/images/MapPinOutlineIcon.svg';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '@/navigation/types';

const GOOGLE_API_KEY = 'dummy-maps-key';

type RouteMapScreenRouteProp = RouteProp<AppStackParamList, 'RouteMapScreen'>;

const RouteMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteMapScreenRouteProp>();
  const { routeData } = route.params;

  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const targetStop = routeData.stops.find(s => s.status === 'TARGET') ?? null;

  const handleBack = () => navigation.goBack();

  const handleStartNavigation = () => {
    if (!targetStop || routeData.readOnly) return;
    const url = Platform.select({
      ios: `maps:0,0?q=${targetStop.lat},${targetStop.lng}`,
      android: `google.navigation:q=${targetStop.lat},${targetStop.lng}`,
    });
    if (url) Linking.openURL(url);
  };

  const handleCall = () => {
    if (targetStop?.phone) {
      Linking.openURL(`tel:${targetStop.phone}`);
    }
  };

  const handleRecenter = () => {
    mapRef.current?.animateToRegion(
      {
        latitude: routeData.origin.lat,
        longitude: routeData.origin.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      1000,
    );
  };

  const waypoints = routeData.stops.map(stop => ({
    latitude: stop.lat,
    longitude: stop.lng,
  }));

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        initialRegion={{
          latitude: routeData.origin.lat,
          longitude: routeData.origin.lng,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {waypoints.length > 0 && (
          <MapViewDirections
            origin={{
              latitude: routeData.origin.lat,
              longitude: routeData.origin.lng,
            }}
            destination={waypoints[waypoints.length - 1]}
            waypoints={waypoints.slice(0, -1)}
            apikey={GOOGLE_API_KEY}
            strokeWidth={4}
            strokeColor="#2E50B2"
            optimizeWaypoints={true}
          />
        )}

        {routeData.stops.map(stop => {
          const isDone = stop.status === 'DONE';
          const isTarget = stop.status === 'TARGET';

          return (
            <Marker
              key={stop.id}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
            >
              <View style={styles.markerContainer}>
                <View
                  style={[
                    styles.markerBubble,
                    isDone && styles.markerDone,
                    isTarget && styles.markerTarget,
                  ]}
                >
                  <Text style={styles.markerText}>{stop.id}</Text>
                </View>
                {isTarget && (
                  <View style={styles.targetBadge}>
                    <Text style={styles.targetBadgeText}>TARGET</Text>
                  </View>
                )}
                {isDone && (
                  <View style={styles.doneBadge}>
                    <Text style={styles.doneBadgeText}>Done</Text>
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <BackArrowIcon stroke="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() =>
            setMapType(prev => (prev === 'standard' ? 'satellite' : 'standard'))
          }
        >
          <LayersIcon />
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={handleRecenter}>
          <CenterLocationIcon />
        </TouchableOpacity>
      </View>

      {targetStop && (
        <View style={styles.bottomCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.nextStopBadge}>
              <Text style={styles.nextStopText}>NEXT STOP</Text>
            </View>
            {!!targetStop.distanceStr && (
              <Text style={styles.distanceText}>In {targetStop.distanceStr ?? ''}</Text>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.addressBlock}>
              <Text style={styles.doctorName}>{targetStop.name}</Text>
              <View style={styles.addressLine}>
                <MapPinOutlineIcon height={14} width={14} />
                <Text style={styles.addressText}>{targetStop.address}</Text>
              </View>
            </View>
            {!!targetStop.timeStr && (
              <View style={styles.timeBlock}>
                <Text style={styles.timeValue}>{targetStop.timeStr}</Text>
                <Text style={styles.timeLabel}>MINS</Text>
              </View>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                routeData.readOnly && styles.buttonDisabled,
              ]}
              onPress={handleStartNavigation}
              disabled={routeData.readOnly}
            >
              <SendArrowIcon />
              <Text style={styles.primaryButtonText}>Start Navigation</Text>
            </TouchableOpacity>
            {targetStop.phone && (
              <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                <PhoneIconOutline />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E5E7EB' },
  map: { ...StyleSheet.absoluteFillObject },
  markerContainer: { alignItems: 'center' },
  markerBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6B7280',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  markerDone: {
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  markerTarget: { backgroundColor: '#2E50B2', transform: [{ scale: 1.15 }] },
  markerText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.bold,
  },
  targetBadge: {
    backgroundColor: '#2E50B2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  targetBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.5,
  },
  doneBadge: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  doneBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontFamily: FONTS.family.medium,
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingControls: {
    position: 'absolute',
    right: 20,
    top: Platform.OS === 'ios' ? 120 : 80,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextStopBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  nextStopText: {
    color: '#2E50B2',
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    letterSpacing: 0.5,
  },
  distanceText: {
    color: '#6B7280',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  addressBlock: { flex: 1, paddingRight: 16 },
  doctorName: {
    fontSize: 22,
    fontFamily: FONTS.family.bold,
    color: '#000',
    marginBottom: 8,
  },
  addressLine: { flexDirection: 'row', alignItems: 'center' },
  addressText: {
    color: '#6B7280',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.regular,
    marginLeft: 6,
  },
  timeBlock: { alignItems: 'center' },
  timeValue: {
    fontSize: 32,
    fontFamily: FONTS.family.bold,
    color: '#000',
    lineHeight: 36,
  },
  timeLabel: {
    fontSize: 10,
    fontFamily: FONTS.family.bold,
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2E50B2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    marginLeft: 12,
  },
  callButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#2E50B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RouteMapScreen;
