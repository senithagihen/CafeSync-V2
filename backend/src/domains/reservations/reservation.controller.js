const { slotHasPassed, presentReservation } = require('./reservation-slot');
const Reservation = require('./reservation.model');

// @desc    Book a table
// @route   POST /api/reservations
// @access  Private
exports.bookTable = async (req, res, next) => {
  try {
    if (slotHasPassed(req.body.date, req.body.time)) {
      return res.status(400).json({ success: false, error: 'Choose a future reservation time.' });
    }
    req.body.customer = req.user.id;

    // Check if table is already booked for that date and time
    const existingReservation = await Reservation.findOne({
      tableNumber: req.body.tableNumber,
      date: req.body.date,
      time: req.body.time,
      status: { $in: ['Pending', 'Confirmed'] },
    });

    if (existingReservation) {
      return res.status(400).json({
        success: false,
        error: 'Table is already booked for this slot',
      });
    }

    const reservation = await Reservation.create(req.body);
    res.status(201).json({ success: true, data: reservation });
  } catch (err) {
    next(err);
  }
};

// @desc    Get booked slots for the current date
// @route   GET /api/reservations/availability
// @access  Private
exports.getAvailability = async (req, res, next) => {
  try {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const booked = await Reservation.find({
      date: today,
      status: { $in: ['Pending', 'Confirmed'] },
    }).select('tableNumber time');
    
    res.status(200).json({ success: true, data: booked });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all reservations
// @route   GET /api/reservations
// @access  Private
exports.getReservations = async (req, res, next) => {
  try {
    let query;

    if (req.user.role === 'admin') {
      query = Reservation.find().populate('customer', 'name email');
    } else {
      query = Reservation.find({ customer: req.user.id });
    }

    const reservations = (await query.sort('-date').lean()).map(presentReservation);
    res.status(200).json({ success: true, count: reservations.length, data: reservations });
  } catch (err) {
    next(err);
  }
};

// @desc    Update reservation (details and/or status)
// @route   PUT /api/reservations/:id
// @access  Private (Admin or Customer for cancellation)
exports.updateReservation = async (req, res, next) => {
  try {
    let reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    // Customer can only cancel
    if (req.user.role !== 'admin' && req.body.status !== 'Cancelled') {
      return res.status(401).json({ success: false, error: 'Unauthorized to change status' });
    }

    // Ownership check for customer
    if (req.user.role !== 'admin' && reservation.customer.toString() !== req.user.id) {
       return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const targetDate = req.body.date !== undefined ? req.body.date : reservation.date;
    const targetTime = req.body.time !== undefined ? req.body.time : reservation.time;
    const targetTable = req.body.tableNumber !== undefined ? Number(req.body.tableNumber) : reservation.tableNumber;
    const targetStatus = req.body.status !== undefined ? req.body.status : reservation.status;

    if (targetStatus === 'Confirmed' && slotHasPassed(targetDate, targetTime)) {
      return res.status(409).json({ success: false, error: 'This reservation time has passed.' });
    }

    // Check conflict if table, date, or time changed while active
    if (['Pending', 'Confirmed'].includes(targetStatus)) {
      const conflict = await Reservation.findOne({
        _id: { $ne: req.params.id },
        tableNumber: targetTable,
        date: targetDate,
        time: targetTime,
        status: { $in: ['Pending', 'Confirmed'] },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: `Table ${targetTable} is already booked for this slot.`,
        });
      }
    }

    const updateData = {};
    if (req.body.status !== undefined) updateData.status = req.body.status;

    if (req.user.role === 'admin') {
      if (req.body.tableNumber !== undefined) updateData.tableNumber = Number(req.body.tableNumber);
      if (req.body.date !== undefined) updateData.date = req.body.date;
      if (req.body.time !== undefined) updateData.time = req.body.time;
      if (req.body.guests !== undefined) updateData.guests = Number(req.body.guests);
      if (req.body.specialRequests !== undefined) updateData.specialRequests = req.body.specialRequests;
    }

    reservation = await Reservation.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate('customer', 'name email');

    res.status(200).json({
      success: true,
      data: presentReservation(reservation.toObject ? reservation.toObject() : reservation),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete reservation
// @route   DELETE /api/reservations/:id
// @access  Private (Admin)
exports.deleteReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);

    if (!reservation) {
      return res.status(404).json({ success: false, error: 'Reservation not found' });
    }

    await reservation.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
