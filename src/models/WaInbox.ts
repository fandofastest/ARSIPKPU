import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const WaArchiveSchema = new Schema(
  {
    archiveId: { type: Schema.Types.ObjectId, required: false, default: null },
    archiveNumber: { type: String, required: false, default: '' },
    originalName: { type: String, required: false, default: '' }
  },
  { _id: false }
);

const WaSenderSchema = new Schema(
  {
    phone: { type: String, required: false, default: '' },
    name: { type: String, required: false, default: '' }
  },
  { _id: false }
);

const WaIntegrationSchema = new Schema(
  {
    tokenId: { type: String, required: false, default: '', index: true },
    appName: { type: String, required: false, default: '' }
  },
  { _id: false }
);

const WaInboxSchema = new Schema(
  {
    messageId: { type: String, required: false, default: '', index: true },
    sourceType: { type: String, required: true, enum: ['group', 'dm', 'api', 'webhook'], default: 'api', index: true },
    sourceId: { type: String, required: false, default: '' },
    sourceName: { type: String, required: false, default: '' },
    sender: { type: WaSenderSchema, required: false, default: () => ({ phone: '', name: '' }) },
    caption: { type: String, required: false, default: '' },
    mimeType: { type: String, required: false, default: '' },
    originalName: { type: String, required: false, default: '' },
    size: { type: Number, required: false, default: 0 },
    status: { type: String, required: true, enum: ['processed', 'failed', 'ignored'], default: 'processed', index: true },
    error: { type: String, required: false, default: '' },
    notes: { type: String, required: false, default: '' },
    integration: { type: WaIntegrationSchema, required: false, default: () => ({ tokenId: '', appName: '' }) },
    archive: { type: WaArchiveSchema, required: true, default: () => ({ archiveId: null, archiveNumber: '', originalName: '' }) },
    rawMeta: { type: Schema.Types.Mixed, required: false, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

WaInboxSchema.index({ createdAt: -1 });
WaInboxSchema.index({ sourceType: 1, status: 1, createdAt: -1 });
WaInboxSchema.index({ 'sender.phone': 1, createdAt: -1 });
WaInboxSchema.index({ 'integration.tokenId': 1, createdAt: -1 });

export type WaInboxDocument = InferSchemaType<typeof WaInboxSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export const WaInbox: Model<WaInboxDocument> =
  (mongoose.models.WaInbox as Model<WaInboxDocument>) || mongoose.model<WaInboxDocument>('WaInbox', WaInboxSchema);
