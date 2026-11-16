// Reservation dates are calendar days at the café in Sri Lanka (UTC+05:30).
function slotHasPassed(date, time, now = Date.now()) {
  const day = new Date(date);
  if (!Number.isFinite(day.getTime())) return false;
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(String(time).trim());
  const calendarDay = day.toISOString().slice(0, 10);
  if (!match) return Date.parse(calendarDay + 'T23:59:59+05:30') < now;
  const [, hours, minutes, period] = match;
  const hour = period ? Number(hours) % 12 + (period.toUpperCase() === 'PM' ? 12 : 0) : Number(hours);
  return Date.parse(calendarDay + 'T' + String(hour).padStart(2, '0') + ':' + minutes + ':00+05:30') < now;
}

function presentReservation(reservation) {
  const pastSlot = slotHasPassed(reservation.date, reservation.time);
  const status = pastSlot && reservation.status === 'Pending' ? 'Expired' : reservation.status;
  return { ...reservation, pastSlot, status };
}

module.exports = { slotHasPassed, presentReservation };
