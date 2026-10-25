import mongoose from 'mongoose';

export const EQUIPMENT_TYPES = ['tractor', 'rotavator', 'seed-drill', 'harvester', 'sprayer', 'water-pump', 'other'];

const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: EQUIPMENT_TYPES, required: true },
    description: { type: String, trim: true, maxlength: 1000 },
    images: { type: [String], default: [], validate: (v) => v.length <= 5 },
    hourlyPaise: { type: Number, min: 100, max: 100_000_000 },
    dailyPaise: { type: Number, min: 100, max: 100_000_000 },
    depositPaise: { type: Number, default: 0, min: 0, max: 100_000_000 },
    // The one fixed place the equipment stays. Renters collect it from here and bring it back here. There is no delivery.
    address: { type: String, trim: true, maxlength: 200 },      // house / landmark line; shown to the renter only once the booking is confirmed
    village: { type: String, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 60 },
    state: { type: String, trim: true, maxlength: 60 },
    pincode: { type: String, trim: true, match: /^[1-9]\d{5}$/ },
    upiId: { type: String, trim: true, maxlength: 80 },          // where the admin sends online rent. Online payment is offered only when this is set
    terms: { type: String, trim: true, maxlength: 1000 },
    active: { type: Boolean, default: true },     // owner's availability switch
    blocked: { type: Boolean, default: false },   // admin moderation switch
  },
  { timestamps: true }
);
schema.pre('validate', function needsARate(next) {
  if (!this.hourlyPaise && !this.dailyPaise) this.invalidate('dailyPaise', 'Set an hourly or a daily rent');
  next();
});
export const Rental = mongoose.model('Rental', schema);

const bookingSchema = new mongoose.Schema(
  {
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    rateType: { type: String, enum: ['hour', 'day'], required: true },
    amountPaise: { type: Number, required: true },
    depositPaise: { type: Number, default: 0 },
    note: { type: String, trim: true, maxlength: 300 },
    contactPhone: { type: String, trim: true },
    status: { type: String, enum: ['requested', 'confirmed', 'rejected', 'cancelled', 'handed_over', 'completed'], default: 'requested', index: true },
    // pay_at_pickup: renter pays the owner when collecting the equipment. online: renter pays the rent (not the deposit) through Razorpay.
    // The refundable deposit is always handed over in person and returned when the equipment comes back.
    paymentMethod: { type: String, enum: ['pay_at_pickup', 'online'], default: 'pay_at_pickup' },
    paymentStatus: { type: String, enum: ['pay_at_pickup', 'unpaid', 'paid', 'refund_due', 'refunded'], default: 'pay_at_pickup', index: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: String,
    paidAt: Date,
    payBy: Date,   // online bookings: pay before this time or the slot is released
    statusAt: { confirmed: Date, handed_over: Date, completed: Date, rejected: Date, cancelled: Date },
  },
  { timestamps: true }
);
export const RentalBooking = mongoose.model('RentalBooking', bookingSchema);
