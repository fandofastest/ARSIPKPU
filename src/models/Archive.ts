import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export type ArchiveStatus = 'active' | 'deleted';

const UploadedBySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true }
  },
  { _id: false }
);

const ArchiveSchema = new Schema(
  {
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    relativePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: UploadedBySchema, required: true },
    isPublic: { type: Boolean, required: true, default: true },
    archiveNumber: { type: String, required: false, default: '' },
    docNumber: { type: String, required: false, default: '' },
    docDate: { type: Date, required: false, default: null },
    docDateSource: {
      type: String,
      required: false,
      enum: ['unknown', 'default', 'user', 'ocr'],
      default: 'unknown'
    },
    unit: { type: String, required: false, default: '' },
    docKind: { type: String, required: false, default: '' },
    unitSender: { type: String, required: false, default: '' },
    unitRecipient: { type: String, required: false, default: '' },
    title: { type: String, required: false, default: '' },
    subject: { type: String, required: false, default: '' },
    year: { type: Number, required: false, default: null },
    category: { type: String, required: false, default: '' },
    extractedText: { type: String, required: false, default: '' },
    ocrStatus: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending'
    },
    ocrError: { type: String, required: false, default: '' },
    ocrUpdatedAt: { type: Date, required: false, default: null },
    type: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    tags: { type: [String], required: false, default: [] },
    status: { type: String, required: true, enum: ['active', 'deleted'], default: 'active' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ArchiveSchema.index({ filename: 1 });
ArchiveSchema.index({ 'uploadedBy.phone': 1 });
ArchiveSchema.index({ archiveNumber: 1 });
ArchiveSchema.index({ docNumber: 1 });
ArchiveSchema.index({ docDate: -1 });
ArchiveSchema.index({ unit: 1 });
ArchiveSchema.index({ docKind: 1 });
ArchiveSchema.index({ unitSender: 1 });
ArchiveSchema.index({ unitRecipient: 1 });
ArchiveSchema.index({ title: 1 });
ArchiveSchema.index({ year: 1 });
ArchiveSchema.index({ category: 1 });
ArchiveSchema.index({ createdAt: -1 });
ArchiveSchema.index({ status: 1 });
ArchiveSchema.index({
  extractedText: 'text',
  originalName: 'text',
  filename: 'text',
  docNumber: 'text',
  docKind: 'text',
  unitSender: 'text',
  unitRecipient: 'text',
  title: 'text',
  subject: 'text',
  category: 'text'
});

export type ArchiveDocument = InferSchemaType<typeof ArchiveSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Archive: Model<ArchiveDocument> =
  (mongoose.models.Archive as Model<ArchiveDocument>) ||
  mongoose.model<ArchiveDocument>('Archive', ArchiveSchema);
