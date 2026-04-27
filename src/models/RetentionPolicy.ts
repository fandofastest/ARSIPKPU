import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const RetentionPolicySchema = new Schema(
  {
    classificationCode: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: false, default: '', maxlength: 2000 },
    activeRetentionYears: { type: Number, required: true, min: 0, max: 200, default: 1 },
    inactiveRetentionYears: { type: Number, required: true, min: 0, max: 200, default: 4 },
    terminalAction: { type: String, required: true, enum: ['permanent', 'disposed'], default: 'disposed' },
    requireApproval: { type: Boolean, required: true, default: true },
    approverRoles: { type: [String], required: true, default: ['admin', 'admin'] },
    notifyBeforeDays: { type: Number, required: true, min: 0, max: 3650, default: 0 },
    legalBasis: { type: String, required: false, default: '', maxlength: 500 },
    enabled: { type: Boolean, required: true, default: true },
    updatedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  },
  { timestamps: true }
);

RetentionPolicySchema.index({ classificationCode: 1 }, { unique: true });
RetentionPolicySchema.index({ enabled: 1 });

export type RetentionPolicyDoc = InferSchemaType<typeof RetentionPolicySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RetentionPolicy: Model<RetentionPolicyDoc> =
  (mongoose.models.RetentionPolicy as Model<RetentionPolicyDoc>) ||
  mongoose.model<RetentionPolicyDoc>('RetentionPolicy', RetentionPolicySchema);
