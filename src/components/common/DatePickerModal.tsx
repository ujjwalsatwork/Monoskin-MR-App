import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORS } from '@/constants/colors';
import { FONTS } from '@/constants/fonts';

type Props = {
  visible: boolean;
  selectedDate: Date | null;
  minDate?: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DatePickerModal = ({ visible, selectedDate, minDate, onSelect, onClose }: Props) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState((selectedDate ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selectedDate ?? today).getMonth());

  useEffect(() => {
    if (visible) {
      const d = selectedDate ?? today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isSelected = (d: number) =>
    !!selectedDate &&
    selectedDate.getDate() === d &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const isToday = (d: number) =>
    today.getDate() === d &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isDisabled = (d: number) => {
    if (!minDate) return false;
    const cell = new Date(viewYear, viewMonth, d);
    cell.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return cell < min;
  };

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.card}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={prevMonth} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={s.monthYear}>{MONTHS_FULL[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={s.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.navText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={s.daysRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={s.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          {rows.map((row, ri) => (
            <View key={ri} style={s.row}>
              {row.map((d, ci) => {
                const sel = d ? isSelected(d) : false;
                const tod = d ? isToday(d) : false;
                const dis = d ? isDisabled(d) : true;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[s.cell, sel && s.cellSel]}
                    disabled={!d || dis}
                    onPress={() => d && onSelect(new Date(viewYear, viewMonth, d))}
                    activeOpacity={0.7}
                  >
                    {d ? (
                      <Text style={[s.cellText, tod && s.todayText, sel && s.cellSelText, dis && s.disabledText]}>
                        {d}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Cancel */}
          <TouchableOpacity style={s.cancelRow} onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const CELL_SIZE = 36;

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(46,80,178,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 22,
    color: COLORS.buttonBlue,
    lineHeight: 26,
    fontFamily: FONTS.family.bold,
  },
  monthYear: {
    fontSize: FONTS.size.lg,
    fontFamily: FONTS.family.bold,
    color: COLORS.textDark,
  },
  daysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.size.xs,
    fontFamily: FONTS.family.bold,
    color: COLORS.textSecondary,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: CELL_SIZE / 2,
  },
  cellSel: {
    backgroundColor: COLORS.buttonBlue,
  },
  cellText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textDark,
  },
  todayText: {
    color: COLORS.buttonBlue,
    fontFamily: FONTS.family.bold,
  },
  cellSelText: {
    color: COLORS.white,
    fontFamily: FONTS.family.bold,
  },
  disabledText: {
    color: COLORS.textMuted,
  },
  cancelRow: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelText: {
    fontSize: FONTS.size.md,
    fontFamily: FONTS.family.medium,
    color: COLORS.textSecondary,
  },
});

export default DatePickerModal;
