import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const IntegrationTokenSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    appType: { type: String, required: true, enum: ['app', 'bot'], default: 'app', index: true },
    tokenHash: { type: String, required: true, select: false },
    status: { type: String, required: true, enum: ['active', 'revoked'], default: 'active', index: true },
    scope: { type: [String], required: true, default: ['upload:create'] },
    expiresAt: { type: Date, required: false, default: null, index: true },
    lastUsedAt: { type: Date, required: false, default: null },
    lastUsedIp: { type: String, required: false, default: '' },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

IntegrationTokenSchema.index({ createdAt: -1 });

export type IntegrationTokenDocument = InferSchemaType<typeof IntegrationTokenSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const IntegrationToken: Model<IntegrationTokenDocument> =
  (mongoose.models.IntegrationToken as Model<IntegrationTokenDocument>) ||
  mongoose.model<IntegrationTokenDocument>('IntegrationToken', IntegrationTokenSchema);
