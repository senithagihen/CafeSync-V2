export const TIME_SLOTS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

export const getLocalDayString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

/**
 * Returns true if the given slot time on dateStr has already passed in Sri Lanka time (UTC+05:30).
 * If dateStr is omitted, today's local date is assumed.
 */
export const isSlotInPast = (timeStr, dateStr = null) => {
  if (!timeStr) return false;
  const targetDateStr = dateStr
    ? (typeof dateStr === 'string'
        ? dateStr.slice(0, 10)
        : new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Colombo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(dateStr)))
    : getLocalDayString(0);

  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(String(timeStr).trim());
  if (!match) return false;

  const [, hours, minutes, period] = match;
  let hour = Number(hours);
  if (period) {
    hour = (hour % 12) + (period.toUpperCase() === 'PM' ? 12 : 0);
  }
  const slotIso = `${targetDateStr}T${String(hour).padStart(2, '0')}:${minutes}:00+05:30`;
  const slotTimestamp = Date.parse(slotIso);
  if (isNaN(slotTimestamp)) return false;

  return slotTimestamp <= Date.now();
};
