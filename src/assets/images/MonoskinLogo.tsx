import React from 'react';
import Svg, { Rect } from 'react-native-svg';
import { COLORS } from '../../constants/colors'; // or from '@/constants/colors'

export const MonoskinLogo = () => (
  <Svg width="36" height="36" viewBox="0 0 40 40" fill="none">
     <Rect x="5" y="15" width="10" height="10" fill={COLORS.white} />
     <Rect x="18" y="5" width="10" height="10" fill={COLORS.white} />
     <Rect x="18" y="18" width="10" height="10" fill={COLORS.white} />
     <Rect x="18" y="31" width="10" height="10" fill={COLORS.white} opacity="0.5" />
  </Svg>
);
