import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList,
    TouchableWithoutFeedback,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '@/navigation/types';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/redux/store';
import { submitLeaveRequest, clearLeaveError } from '@/redux/slices/leaveSlice';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';
import Header from '@/components/common/Header';
import DatePickerModal from '@/components/common/DatePickerModal';
import { Down } from '@/assets/images';
import dayjs from 'dayjs';

// ─── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES: { label: string; value: string }[] = [
    { label: 'Casual Leave',       value: 'casual' },
    { label: 'Sick Leave',         value: 'sick' },
    { label: 'Annual Leave',       value: 'annual' },
    { label: 'Maternity Leave',    value: 'maternity' },
    { label: 'Paternity Leave',    value: 'paternity' },
    { label: 'Unpaid Leave',       value: 'unpaid' },
    { label: 'Compensatory Leave', value: 'compensatory' },
    { label: 'Bereavement Leave',  value: 'bereavement' },
];

const calcTotalDays = (start: Date | null, end: Date | null): number => {
    if (!start || !end) return 0;
    return Math.max(0, dayjs(end).startOf('day').diff(dayjs(start).startOf('day'), 'day') + 1);
};

// ─── Leave Type Bottom Sheet ───────────────────────────────────────────────────

type LeaveTypeSheetProps = {
    visible: boolean;
    selectedValue: string;
    onSelect: (value: string) => void;
    onClose: () => void;
};

const LeaveTypeSheet = ({ visible, selectedValue, onSelect, onClose }: LeaveTypeSheetProps) => (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={onClose}>
            <View style={sheet.overlay} />
        </TouchableWithoutFeedback>
        <View style={sheet.container}>
            <View style={sheet.handle} />
            <Text style={sheet.title}>Select Leave Type</Text>
            <FlatList
                data={LEAVE_TYPES}
                keyExtractor={item => item.value}
                scrollEnabled={false}
                renderItem={({ item }) => {
                    const active = item.value === selectedValue;
                    return (
                        <TouchableOpacity
                            style={sheet.option}
                            activeOpacity={0.7}
                            onPress={() => { onSelect(item.value); onClose(); }}
                        >
                            <Text style={[sheet.optionText, active && sheet.optionActive]}>{item.label}</Text>
                            {active && <Text style={sheet.check}>✓</Text>}
                        </TouchableOpacity>
                    );
                }}
                ItemSeparatorComponent={() => <View style={sheet.sep} />}
            />
        </View>
    </Modal>
);

const sheet = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' },
    container: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 36,
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
    title: {
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
        color: COLORS.textDark,
        marginBottom: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
    },
    optionText: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.regular,
        color: COLORS.textDark,
    },
    optionActive: {
        fontFamily: FONTS.family.bold,
        color: COLORS.buttonBlue,
    },
    check: { fontSize: FONTS.size.lg, color: COLORS.buttonBlue },
    sep: { height: 1, backgroundColor: COLORS.border },
});

// ─── Field wrapper ─────────────────────────────────────────────────────────────

const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <View style={styles.fieldGroup}>
        <Text style={styles.label}>{label}</Text>
        {children}
        {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const SubmitLeaveScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const dispatch = useDispatch<AppDispatch>();
    const { submitLoading } = useSelector((state: RootState) => state.leave);

    const [leaveType, setLeaveType] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [leaveTypeSheetVisible, setLeaveTypeSheetVisible] = useState(false);
    const [startPickerVisible, setStartPickerVisible] = useState(false);
    const [endPickerVisible, setEndPickerVisible] = useState(false);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!leaveType) e.leaveType = 'Please select a leave type.';
        if (!startDate) e.startDate = 'Start date is required.';
        if (!endDate) e.endDate = 'End date is required.';
        if (startDate && endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day')) {
            e.endDate = 'End date cannot be before start date.';
        }
        if (!reason.trim()) e.reason = 'Reason is required.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = useCallback(async () => {
        if (!validate()) return;

        dispatch(clearLeaveError());
        const result = await dispatch(
            submitLeaveRequest({
                leaveType,
                startDate: dayjs(startDate).format('YYYY-MM-DD'),
                endDate: dayjs(endDate).format('YYYY-MM-DD'),
                totalDays: String(calcTotalDays(startDate, endDate)),
                reason: reason.trim(),
            }),
        );

        if (submitLeaveRequest.fulfilled.match(result)) {
            Alert.alert('Success', 'Your leave request has been submitted successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } else {
            const payload = result.payload as { message?: string } | undefined;
            Alert.alert(
                'Submission Failed',
                payload?.message ?? 'Failed to submit leave request. Please try again.',
            );
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, leaveType, startDate, endDate, reason]);

    const handleStartDateSelect = (date: Date) => {
        setStartDate(date);
        setStartPickerVisible(false);
        if (endDate && dayjs(endDate).isBefore(dayjs(date), 'day')) {
            setEndDate(null);
        }
        setErrors(prev => ({ ...prev, startDate: '' }));
    };

    const handleEndDateSelect = (date: Date) => {
        setEndDate(date);
        setEndPickerVisible(false);
        setErrors(prev => ({ ...prev, endDate: '' }));
    };

    return (
        <View style={styles.container}>
            <Header title="Submit Leave Request" showBack />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Leave Type */}
                <Field label="Leave Type *" error={errors.leaveType}>
                    <TouchableOpacity
                        style={[styles.dropdown, !!errors.leaveType && styles.inputError]}
                        activeOpacity={0.8}
                        onPress={() => setLeaveTypeSheetVisible(true)}
                    >
                        <Text style={[styles.dropdownText, !!leaveType && styles.dropdownSelected]}>
                            {LEAVE_TYPES.find(t => t.value === leaveType)?.label ?? 'Select leave type'}
                        </Text>
                        <Down width={16} height={16} stroke={COLORS.textSecondary} />
                    </TouchableOpacity>
                </Field>

                {/* Start Date */}
                <Field label="Start Date *" error={errors.startDate}>
                    <TouchableOpacity
                        style={[styles.dropdown, !!errors.startDate && styles.inputError]}
                        activeOpacity={0.8}
                        onPress={() => setStartPickerVisible(true)}
                    >
                        <Text style={[styles.dropdownText, !!startDate && styles.dropdownSelected]}>
                            {startDate ? dayjs(startDate).format('DD MMM YYYY') : 'Select start date'}
                        </Text>
                        <Down width={16} height={16} stroke={COLORS.textSecondary} />
                    </TouchableOpacity>
                </Field>

                {/* End Date */}
                <Field label="End Date *" error={errors.endDate}>
                    <TouchableOpacity
                        style={[styles.dropdown, !!errors.endDate && styles.inputError]}
                        activeOpacity={0.8}
                        onPress={() => setEndPickerVisible(true)}
                    >
                        <Text style={[styles.dropdownText, !!endDate && styles.dropdownSelected]}>
                            {endDate ? dayjs(endDate).format('DD MMM YYYY') : 'Select end date'}
                        </Text>
                        <Down width={16} height={16} stroke={COLORS.textSecondary} />
                    </TouchableOpacity>
                </Field>

                {/* Reason */}
                <Field label="Reason *" error={errors.reason}>
                    <TextInput
                        style={[styles.input, styles.reasonInput, !!errors.reason && styles.inputError]}
                        placeholder="Enter reason for leave..."
                        placeholderTextColor={COLORS.textMuted}
                        multiline
                        textAlignVertical="top"
                        value={reason}
                        onChangeText={(t) => {
                            setReason(t);
                            if (t.trim()) setErrors(prev => ({ ...prev, reason: '' }));
                        }}
                    />
                </Field>
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.saveBtn, submitLoading && styles.saveBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={submitLoading}
                    activeOpacity={0.8}
                >
                    {submitLoading ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                        <Text style={styles.saveBtnText}>Submit Leave Request</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Leave Type Bottom Sheet */}
            <LeaveTypeSheet
                visible={leaveTypeSheetVisible}
                selectedValue={leaveType}
                onSelect={(val) => {
                    setLeaveType(val);
                    setErrors(prev => ({ ...prev, leaveType: '' }));
                }}
                onClose={() => setLeaveTypeSheetVisible(false)}
            />

            {/* Date Pickers */}
            <DatePickerModal
                visible={startPickerVisible}
                selectedDate={startDate}
                onSelect={handleStartDateSelect}
                onClose={() => setStartPickerVisible(false)}
            />
            <DatePickerModal
                visible={endPickerVisible}
                selectedDate={endDate}
                minDate={startDate ?? undefined}
                onSelect={handleEndDateSelect}
                onClose={() => setEndPickerVisible(false)}
            />
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 24,
    },
    fieldGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.medium,
        color: COLORS.textDark,
        marginBottom: 8,
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
    reasonInput: {
        borderRadius: 16,
        minHeight: 110,
        paddingTop: Platform.OS === 'ios' ? 14 : 12,
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
    dropdownText: {
        fontSize: FONTS.size.md,
        fontFamily: FONTS.family.regular,
        color: COLORS.textMuted,
    },
    dropdownSelected: {
        color: COLORS.textDark,
        fontFamily: FONTS.family.medium,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        fontSize: FONTS.size.xs,
        fontFamily: FONTS.family.regular,
        color: COLORS.error,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    footer: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
        paddingTop: 12,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    saveBtn: {
        backgroundColor: COLORS.buttonBlue,
        borderRadius: 28,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        fontSize: FONTS.size.lg,
        fontFamily: FONTS.family.bold,
        color: COLORS.white,
    },
});

export default SubmitLeaveScreen;
