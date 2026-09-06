import mongoose from "mongoose";

const { Schema } = mongoose;

const shopSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    block: { type: String, required: true, trim: true },
    shopNumber: { type: String, required: true, trim: true },

    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    monthlyRent: { type: Number, required: true, min: 0 },

    agreement: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },

    // Public/semi-private directory visibility, owner consent required (GDPR-adjacent)
    listedInDirectory: { type: Boolean, default: false },
    contactVisibleInDirectory: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shopSchema.index({ block: 1, shopNumber: 1 }, { unique: true });

shopSchema.virtual("agreementStatus").get(function agreementStatus() {
  const now = new Date();
  const daysLeft = Math.ceil((this.agreement.endDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring_soon";
  return "active";
});

shopSchema.set("toJSON", { virtuals: true });
shopSchema.set("toObject", { virtuals: true });

export default mongoose.model("Shop", shopSchema);
