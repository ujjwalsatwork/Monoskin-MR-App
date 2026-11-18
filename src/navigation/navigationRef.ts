import { createNavigationContainerRef } from '@react-navigation/native';
import { AppStackParamList } from './types';

// Lets components rendered *outside* any screen (e.g. the global active-visit
// banner) navigate without a `useNavigation` context.
export const navigationRef = createNavigationContainerRef<AppStackParamList>();
