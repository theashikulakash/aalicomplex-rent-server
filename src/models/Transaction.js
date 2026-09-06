import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    collectedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    amount: { type: Number, required: true, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },

    method: {
      type: String,
      enum: ["cash", "bkash", "nagad", "bank_transfer", "other"],
      default: "cash",
    },

    // The rent period this payment covers, e.g. "2026-09"
    forPeriod: { type: String, required: true },

    paymentDate: { type: Date, default: Date.now },

    receiptCode: { type: String, required: true, unique: true },

    // Admin can adjust/correct entries per PRD (PATCH=admin adjustment)
    adjustedBy: { type: Schema.Types.ObjectId, ref: "User" },
    adjustmentNote: { type: String },

    status: {
      type: String,
      enum: ["confirmed", "voided"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

transactionSchema.index({ shop: 1, forPeriod: 1 });

export default mongoose.model("Transaction", transactionSchema);
