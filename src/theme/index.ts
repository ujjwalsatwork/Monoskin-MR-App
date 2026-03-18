import { COLORS } from '@/constants/colors';
import { globalStyles } from './globalStyles';

export { COLORS, globalStyles };

export const theme = {
    colors: COLORS,
    styles: globalStyles,
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    typography: {
        h1: { fontSize: 32, fontWeight: 'bold' },
        h2: { fontSize: 24, fontWeight: 'bold' },
        h3: { fontSize: 18, fontWeight: '600' },
        body: { fontSize: 16, fontWeight: 'normal' },
        caption: { fontSize: 12, fontWeight: 'normal' },
    },
};
