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

// @desc    Update reservation status
// @route   PUT /api/reservations/:id/status
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

    if (req.body.status === 'Confirmed' && slotHasPassed(reservation.date, reservation.time)) {
      return res.status(409).json({ success: false, error: 'This reservation time has passed.' });
    }
    reservation = await Reservation.findByIdAndUpdate(req.params.id, { status: req.body.status }, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: reservation });
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
