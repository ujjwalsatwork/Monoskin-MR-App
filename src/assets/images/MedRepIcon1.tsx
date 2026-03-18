import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

export const MedRepIcon = () => (
  <Svg width="80" height="80" viewBox="0 0 64 64" fill="none" stroke={COLORS.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M26 24a8 8 0 100-16 8 8 0 000 16z" />
    <Path d="M10 48v-4a16 16 0 0116-16h4" />
    <Rect x="36" y="28" width="20" height="24" rx="2" />
    <Path d="M41 40l3 3 7-7" />
  </Svg>
);
