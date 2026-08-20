import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    cartId: String,
    itemId: String,
    name: String,
    price: String,
    img: String,
    category: String,
    section: String,
    rowTitle: String,
    color: String,
    size: String,
    quantity: { type: Number, default: 1 },
    userRating: { type: Number, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    customerEmail: { type: String, default: null },
    customerName: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    items: [orderItemSchema],
    subtotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'packing', 'delivery_2d', 'delivered'],
      default: 'pending',
    },
    statusNote: { type: String, default: '' },
    isArchived: { type: Boolean, default: false }, // admin-only hide; customer still sees it
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);