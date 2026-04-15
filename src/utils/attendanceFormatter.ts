import dayjs from 'dayjs';

export interface AttendanceApiRecord {
  id: number;
  mrId: number;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  location: string;
  notes: string | null;
  createdAt: string;
}

export interface AttendanceHistoryItem {
  id: string;
  date: string;
  day: string;
  isToday: boolean;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
  timeIn: string;
  timeOut: string;
}

const formatTime = (time: string | null | undefined): string => {
  if (!time) return '--:-- --';
  const parsed = dayjs(`2000-01-01 ${time}`);
  if (!parsed.isValid()) return '--:-- --';
  return parsed.format('hh:mm A');
};

const normalizeStatus = (status: string): AttendanceHistoryItem['status'] => {
  const upper = status.toUpperCase();
  if (upper === 'PRESENT') return 'PRESENT';
  if (upper === 'LATE') return 'LATE';
  return 'ABSENT';
};

export const transformAttendanceData = (
  apiData: AttendanceApiRecord[],
): AttendanceHistoryItem[] => {
  const today = dayjs().format('YYYY-MM-DD');

  const grouped = new Map<string, AttendanceApiRecord[]>();
  for (const record of apiData) {
    const existing = grouped.get(record.date) ?? [];
    existing.push(record);
    grouped.set(record.date, existing);
  }

  const result: AttendanceHistoryItem[] = [];

  grouped.forEach((records, date) => {
    const checkIns = records
      .map((r) => r.checkIn)
      .filter((t): t is string => t !== null && t !== undefined && t !== '');

    const checkOuts = records
      .map((r) => r.checkOut)
      .filter((t): t is string => t !== null && t !== undefined && t !== '');

    const earliestCheckIn =
      checkIns.length > 0
        ? checkIns.reduce((a, b) => (a < b ? a : b))
        : null;

    const latestCheckOut =
      checkOuts.length > 0
        ? checkOuts.reduce((a, b) => (a > b ? a : b))
        : null;

    const representativeStatus = records.find(
      (r) => r.status.toUpperCase() !== 'ABSENT',
    )?.status ?? records[0].status;

    const parsedDate = dayjs(date);

    result.push({
      id: date,
      date: parsedDate.format('MMM DD, YYYY'),
      day: parsedDate.format('dddd'),
      isToday: date === today,
      status: normalizeStatus(representativeStatus),
      timeIn: formatTime(earliestCheckIn),
      timeOut: formatTime(latestCheckOut),
    });
  });

  result.sort((a, b) => {
    const dateA = dayjs(a.date, 'MMM DD, YYYY');
    const dateB = dayjs(b.date, 'MMM DD, YYYY');
    return dateB.valueOf() - dateA.valueOf();
  });

  return result;
};
