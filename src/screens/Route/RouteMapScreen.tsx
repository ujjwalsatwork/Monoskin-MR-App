import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
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
import Config from 'react-native-config';

const GOOGLE_API_KEY = Config.GOOGLE_MAPS_API_KEY ?? '';

type RouteStop = AppStackParamList['RouteMapScreen']['routeData']['stops'][number];
type RouteMapScreenRouteProp = RouteProp<AppStackParamList, 'RouteMapScreen'>;

interface LatLng {
  lat: number;
  lng: number;
}

interface MapCoord {
  latitude: number;
  longitude: number;
}

function hasCoords(stop: RouteStop): boolean {
  return stop.lat !== 0 || stop.lng !== 0;
}

// Decode a Google encoded polyline string into map coordinates
/* eslint-disable no-bitwise */
function decodePolyline(encoded: string): MapCoord[] {
  const coords: MapCoord[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coords;
}
/* eslint-enable no-bitwise */

async function geocodeAddress(address: string): Promise<LatLng | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === 'OK' && json.results.length > 0) {
      const { lat, lng } = json.results[0].geometry.location;
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
}

// Fetch a driving route from Google Routes API (new) and return decoded polyline coords
async function fetchRoutePolyline(
  origin: LatLng,
  destination: LatLng,
  intermediates: LatLng[],
): Promise<MapCoord[]> {
  try {
    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      intermediates: intermediates.map(p => ({
        location: { latLng: { latitude: p.lat, longitude: p.lng } },
      })),
      travelMode: 'DRIVE',
      optimizeWaypointOrder: true,
    };

    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    const encoded: string | undefined = json?.routes?.[0]?.polyline?.encodedPolyline;
    return encoded ? decodePolyline(encoded) : [];
  } catch {
    return [];
  }
}

const RouteMapScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteMapScreenRouteProp>();
  const { routeData } = route.params;

  const mapRef = useRef<MapView>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [resolvedStops, setResolvedStops] = useState<RouteStop[]>(routeData.stops);
  const [geocoding, setGeocoding] = useState(false);
  const [routeCoords, setRouteCoords] = useState<MapCoord[]>([]);

  // Fetch device GPS location — used as map centre and directions origin
  useEffect(() => {
    Geolocation.getCurrentPosition(
      pos => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        const o = routeData.origin;
        if (o.lat !== 0 || o.lng !== 0) {
          setCurrentLocation(o);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  }, [routeData.origin]);

  // Geocode any stops that are missing coordinates
  useEffect(() => {
    const needsGeocode = routeData.stops.some(s => !hasCoords(s) && s.address);
    if (!needsGeocode) return;

    setGeocoding(true);
    Promise.all(
      routeData.stops.map(async stop => {
        if (hasCoords(stop) || !stop.address) return stop;
        const coords = await geocodeAddress(stop.address);
        return coords ? { ...stop, lat: coords.lat, lng: coords.lng } : stop;
      }),
    ).then(resolved => {
      setResolvedStops(resolved);
      setGeocoding(false);
    });
  }, [routeData.stops]);

  const targetStop = resolvedStops.find(s => s.status === 'TARGET') ?? null;

  // Use current GPS as origin; fall back to routeData.origin if available
  const origin: LatLng | null =
    currentLocation ??
    (routeData.origin.lat !== 0 || routeData.origin.lng !== 0 ? routeData.origin : null);

  const validStops = resolvedStops.filter(hasCoords);

  // Fetch route polyline from Google Routes API whenever origin or resolved stops change
  useEffect(() => {
    if (!origin || validStops.length === 0) return;

    const destination = validStops[validStops.length - 1];
    const intermediates = validStops.slice(0, -1).map(s => ({ lat: s.lat, lng: s.lng }));

    fetchRoutePolyline(origin, { lat: destination.lat, lng: destination.lng }, intermediates)
      .then(setRouteCoords);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, resolvedStops]);

  const handleBack = () => navigation.goBack();

  const handleStartNavigation = () => {
    if (!targetStop || routeData.readOnly || !hasCoords(targetStop)) return;
    const url = Platform.select({
      ios: `maps://maps.apple.com/?daddr=${targetStop.lat},${targetStop.lng}&dirflg=d`,
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
    if (!origin) return;
    mapRef.current?.animateToRegion(
      {
        latitude: origin.lat,
        longitude: origin.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      },
      1000,
    );
  };

  // Show a spinner until we know the map centre
  if (!origin) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2E50B2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        mapType={mapType}
        showsUserLocation
        followsUserLocation={false}
        initialRegion={{
          latitude: origin.lat,
          longitude: origin.lng,
          latitudeDelta: 0.08,
          longitudeDelta: 0.08,
        }}
      >
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#2E50B2"
          />
        )}

        {resolvedStops.map(stop => {
          if (!hasCoords(stop)) return null;
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

      {geocoding && (
        <View style={styles.geocodingBanner}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.geocodingText}>Locating stops…</Text>
        </View>
      )}

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
                (routeData.readOnly || !hasCoords(targetStop)) && styles.buttonDisabled,
              ]}
              onPress={handleStartNavigation}
              disabled={routeData.readOnly || !hasCoords(targetStop)}
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
  centered: { justifyContent: 'center', alignItems: 'center' },
  map: { ...StyleSheet.absoluteFillObject },
  geocodingBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 70,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  geocodingText: {
    color: '#FFFFFF',
    fontSize: FONTS.size.sm,
    fontFamily: FONTS.family.medium,
  },
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
