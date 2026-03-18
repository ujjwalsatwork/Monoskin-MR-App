import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

export const RightArrowIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 12h14M12 5l7 7-7 7"/>
  </Svg>
);
