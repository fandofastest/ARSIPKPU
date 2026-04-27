import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const StageSchema = new Schema(
  {
    order: { type: Number, required: true },
    role: { type: String, required: true, enum: ['admin', 'staff', 'viewer'] },
    status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    decidedBy: {
      userId: { type: String, required: false, default: '' },
      name: { type: String, required: false, default: '' },
      phone: { type: String, required: false, default: '' }
    },
    decidedAt: { type: Date, required: false, default: null },
    note: { type: String, required: false, default: '', maxlength: 1000 }
  },
  { _id: false }
);

const DisposalRequestSchema = new Schema(
  {
    archiveId: { type: Schema.Types.ObjectId, required: true, index: true },
    classificationCode: { type: String, required: true, default: '' },
    policyCode: { type: String, required: true, default: '' },
    eligibleAt: { type: Date, required: true },
    overallStatus: { type: String, required: true, enum: ['pending', 'approved', 'rejected', 'executed'], default: 'pending' },
    stages: { type: [StageSchema], required: true, default: [] },
    createdBySystem: { type: Boolean, required: true, default: true },
    executedAt: { type: Date, required: false, default: null }
  },
  { timestamps: true }
);

DisposalRequestSchema.index({ archiveId: 1, overallStatus: 1 });
DisposalRequestSchema.index({ overallStatus: 1, createdAt: -1 });

export type DisposalRequestDoc = InferSchemaType<typeof DisposalRequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DisposalRequest: Model<DisposalRequestDoc> =
  (mongoose.models.DisposalRequest as Model<DisposalRequestDoc>) ||
  mongoose.model<DisposalRequestDoc>('DisposalRequest', DisposalRequestSchema);
