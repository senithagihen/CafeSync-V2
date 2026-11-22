const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slotHasPassed, presentReservation } = require('../src/domains/reservations/reservation-slot');

test('booking time uses the café local day for noon, midnight and 24-hour slots', () => {
  const now = Date.parse('2026-11-16T06:29:59Z');
  assert.equal(slotHasPassed('2026-11-16', '12:00 PM', now), false);
  assert.equal(slotHasPassed('2026-11-16', '12:00 AM', now), true);
  assert.equal(slotHasPassed('2026-11-16', '08:00', now), true);
  assert.equal(slotHasPassed('2026-11-16', '12:00 PM', now + 2000), true);
});

test('expired pending bookings appear in history without modifying stored status', () => {
  const booking = { status: 'Pending', date: '2000-01-02', time: '10:00 AM' };
  assert.equal(presentReservation(booking).status, 'Expired');
  assert.equal(booking.status, 'Pending');
  for (const status of ['Confirmed', 'Completed', 'Cancelled']) {
    assert.deepEqual(presentReservation({ ...booking, status }), { ...booking, status, pastSlot: true });
  }
});

test('slotHasPassed accurately evaluates Date objects and local Colombo timezone', () => {
  const day = new Date('2026-11-20T00:00:00.000Z');
  // Past time on that day
  assert.equal(slotHasPassed(day, '08:00 AM', Date.parse('2026-11-20T10:00:00+05:30')), true);
  // Future time on that day
  assert.equal(slotHasPassed(day, '06:00 PM', Date.parse('2026-11-20T10:00:00+05:30')), false);
});
