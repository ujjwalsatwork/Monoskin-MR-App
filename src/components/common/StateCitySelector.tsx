import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Modal, FlatList, TouchableWithoutFeedback, Platform,
  KeyboardAvoidingView, Dimensions,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import { Down } from '@/assets/images';
import INDIA_DATA from '@/assets/data/indiaStatesCities.json';

// Fixed result-list height keeps the sheet a constant size regardless of how
// many results match — so it no longer grows/shrinks while the user types.
const LIST_HEIGHT = Math.round(Dimensions.get('window').height * 0.38);

// India-only states/cities (≈49KB). Replaces `country-state-city`, whose
// getCitiesOfState() eagerly inflates all 148k global cities on first call —
// that synchronous allocation crashed Hermes when the city field was opened.
const ALL_STATES: { isoCode: string; name: string }[] = INDIA_DATA.states;
const CITIES_BY_STATE = INDIA_DATA.cities as Record<string, string[]>;

type Props = {
  stateValue: string;
  cityValue: string;
  onStateChange: (value: string) => void;
  onCityChange: (value: string) => void;
  stateLabel?: string;
  cityLabel?: string;
};

const StateCitySelector: React.FC<Props> = ({
  stateValue,
  cityValue,
  onStateChange,
  onCityChange,
  stateLabel = 'State',
  cityLabel = 'City *',
}) => {
  const initialized = useRef(false);

  const [selectedStateCode, setSelectedStateCode] = useState<string | null>(null);
  const [isCustomState, setIsCustomState] = useState(false);
  const [customStateText, setCustomStateText] = useState('');

  const [isCustomCity, setIsCustomCity] = useState(false);
  const [customCityText, setCustomCityText] = useState('');

  const [showStateModal, setShowStateModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // Run once on mount to handle edit-mode pre-population without flicker
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!stateValue) return;

    const matchedState = ALL_STATES.find(
      s => s.name.toLowerCase() === stateValue.toLowerCase(),
    );

    if (matchedState) {
      setSelectedStateCode(matchedState.isoCode);
      setIsCustomState(false);

      if (cityValue) {
        const cities = CITIES_BY_STATE[matchedState.isoCode] ?? [];
        const matchedCity = cities.find(
          c => c.toLowerCase() === cityValue.toLowerCase(),
        );
        if (!matchedCity) {
          setIsCustomCity(true);
          setCustomCityText(cityValue);
        }
      }
    } else {
      // Saved state not in our dataset → treat as "Other"
      setIsCustomState(true);
      setCustomStateText(stateValue);
      if (cityValue) {
        setIsCustomCity(true);
        setCustomCityText(cityValue);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allCities = useMemo<{ name: string }[]>(() => {
    if (!selectedStateCode) return [];
    return (CITIES_BY_STATE[selectedStateCode] ?? []).map(name => ({ name }));
  }, [selectedStateCode]);

  const filteredStates = useMemo(() => {
    if (!stateSearch) return ALL_STATES;
    const q = stateSearch.toLowerCase();
    return ALL_STATES.filter(s => s.name.toLowerCase().includes(q));
  }, [stateSearch]);

  const filteredCities = useMemo(() => {
    if (!citySearch) return allCities;
    const q = citySearch.toLowerCase();
    return allCities.filter(c => c.name.toLowerCase().includes(q));
  }, [allCities, citySearch]);

  const handleSelectState = (name: string, code: string) => {
    setSelectedStateCode(code);
    setIsCustomState(false);
    setCustomStateText('');
    onStateChange(name);
    // Changing state always clears city to prevent invalid State-City pairs
    onCityChange('');
    setIsCustomCity(false);
    setCustomCityText('');
    setShowStateModal(false);
    setStateSearch('');
  };

  const handleSelectOtherState = () => {
    setSelectedStateCode(null);
    setIsCustomState(true);
    setCustomStateText('');
    onStateChange('');
    onCityChange('');
    setIsCustomCity(false);
    setCustomCityText('');
    setShowStateModal(false);
    setStateSearch('');
  };

  const handleSelectCity = (name: string) => {
    setIsCustomCity(false);
    setCustomCityText('');
    onCityChange(name);
    setShowCityModal(false);
    setCitySearch('');
  };

  const handleSelectOtherCity = () => {
    setIsCustomCity(true);
    setCustomCityText('');
    onCityChange('');
    setShowCityModal(false);
    setCitySearch('');
  };

  // City picker is disabled until a state is chosen (either from list or custom)
  const cityDisabled = !stateValue && !isCustomState;

  const stateDisplayText = isCustomState
    ? customStateText || 'Type state name below...'
    : stateValue || 'Select State';

  const cityDisplayText = cityDisabled
    ? 'Select State first'
    : isCustomCity
    ? customCityText || 'Type city name below...'
    : cityValue || 'Select City';

  return (
    <View>
      {/* ── State Field ── */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{stateLabel}</Text>
        <TouchableOpacity
          style={styles.dropdown}
          activeOpacity={0.8}
          onPress={() => {
            setStateSearch('');
            setShowStateModal(true);
          }}
        >
          <Text
            style={[styles.dropdownText, stateValue ? styles.dropdownSelected : null]}
            numberOfLines={1}
          >
            {stateDisplayText}
          </Text>
          <Down width={16} height={16} stroke={COLORS.textSecondary} />
        </TouchableOpacity>
        {isCustomState && (
          <TextInput
            style={[styles.input, styles.customInput]}
            placeholder="Enter state name"
            placeholderTextColor={COLORS.textMuted}
            value={customStateText}
            onChangeText={text => {
              setCustomStateText(text);
              onStateChange(text);
            }}
          />
        )}
      </View>

      {/* ── City Field ── */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{cityLabel}</Text>
        <TouchableOpacity
          style={[styles.dropdown, cityDisabled ? styles.dropdownDisabled : null]}
          activeOpacity={cityDisabled ? 1 : 0.8}
          onPress={() => {
            if (!cityDisabled) {
              setCitySearch('');
              setShowCityModal(true);
            }
          }}
        >
          <Text
            style={[
              styles.dropdownText,
              !cityDisabled && cityValue ? styles.dropdownSelected : null,
              cityDisabled ? styles.dropdownTextDisabled : null,
            ]}
            numberOfLines={1}
          >
            {cityDisplayText}
          </Text>
          <Down
            width={16}
            height={16}
            stroke={cityDisabled ? COLORS.border : COLORS.textSecondary}
          />
        </TouchableOpacity>
        {isCustomCity && !cityDisabled && (
          <TextInput
            style={[styles.input, styles.customInput]}
            placeholder="Enter city name"
            placeholderTextColor={COLORS.textMuted}
            value={customCityText}
            onChangeText={text => {
              setCustomCityText(text);
              onCityChange(text);
            }}
          />
        )}
      </View>

      {/* ── State Search Modal ── */}
      <Modal
        transparent
        statusBarTranslucent
        animationType="slide"
        visible={showStateModal}
        onRequestClose={() => setShowStateModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={() => setShowStateModal(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select State</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search state..."
              placeholderTextColor={COLORS.textMuted}
              value={stateSearch}
              onChangeText={setStateSearch}
              autoFocus
            />
            <FlatList
              data={filteredStates}
              keyExtractor={s => s.isoCode}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = item.name === stateValue && !isCustomState;
              return (
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.7}
                  onPress={() => handleSelectState(item.name, item.isoCode)}
                >
                  <Text style={[styles.optionText, active ? styles.optionActive : null]}>
                    {item.name}
                  </Text>
                  {active && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            ListFooterComponent={() => (
              <>
                <View style={styles.sep} />
                <TouchableOpacity
                  style={styles.option}
                  activeOpacity={0.7}
                  onPress={handleSelectOtherState}
                >
                  <Text style={[styles.optionText, styles.otherOption]}>Other (Custom)</Text>
                  {isCustomState && <Text style={styles.check}>✓</Text>}
                </TouchableOpacity>
              </>
            )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── City Search Modal ── */}
      <Modal
        transparent
        statusBarTranslucent
        animationType="slide"
        visible={showCityModal}
        onRequestClose={() => setShowCityModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableWithoutFeedback onPress={() => setShowCityModal(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Select City</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search city..."
              placeholderTextColor={COLORS.textMuted}
              value={citySearch}
              onChangeText={setCitySearch}
              autoFocus
            />
            <FlatList
              data={filteredCities}
              keyExtractor={(item, idx) => `${item.name}-${idx}`}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.name === cityValue && !isCustomCity;
                return (
                  <TouchableOpacity
                    style={styles.option}
                    activeOpacity={0.7}
                    onPress={() => handleSelectCity(item.name)}
                  >
                    <Text style={[styles.optionText, active ? styles.optionActive : null]}>
                      {item.name}
                    </Text>
                    {active && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              ListFooterComponent={() => (
                <>
                  <View style={styles.sep} />
                  <TouchableOpacity
                    style={styles.option}
                    activeOpacity={0.7}
                    onPress={handleSelectOtherCity}
                  >
                    <Text style={[styles.optionText, styles.otherOption]}>Other (Custom)</Text>
                    {isCustomCity && <Text style={styles.check}>✓</Text>}
                  </TouchableOpacity>
                </>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: 16 },
  label: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
  },
  dropdownDisabled: {
    backgroundColor: '#F9FAFB',
  },
  dropdownText: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textMuted,
    marginRight: 8,
  },
  dropdownSelected: {
    color: COLORS.textDark,
  },
  dropdownTextDisabled: {
    color: COLORS.border,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
  customInput: {
    marginTop: 8,
  },
  // Modal layout: KAV fills the screen and pins the sheet to the bottom,
  // lifting it above the keyboard. The backdrop sits behind the sheet.
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
    marginBottom: 8,
  },
  list: { height: LIST_HEIGHT },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionText: {
    flex: 1,
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.regular,
    color: COLORS.textDark,
  },
  optionActive: {
    fontFamily: FONTS.family.bold,
    color: COLORS.buttonBlue,
  },
  otherOption: {
    color: COLORS.buttonBlue,
    fontFamily: FONTS.family.bold,
  },
  check: { fontSize: FONTS.size.lg, color: COLORS.buttonBlue },
  sep: { height: 1, backgroundColor: COLORS.border },
});

export default StateCitySelector;
