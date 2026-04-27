import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export type ArchiveStatus = 'active' | 'deleted';
export type ArchiveVisibility = 'public' | 'private' | 'shared';
export type ArchiveLifecycleState = 'ACTIVE' | 'INACTIVE' | 'PERMANENT' | 'DISPOSED';
export type ArchiveStorageTier = 'hot' | 'cold';

const UploadedBySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true }
  },
  { _id: false }
);

const SharedWithSchema = new Schema(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, required: true, enum: ['viewer', 'editor'], default: 'viewer' }
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
    checksumSha256: { type: String, required: false, default: '' },
    uploadedBy: { type: UploadedBySchema, required: true },
    visibility: { type: String, required: true, enum: ['public', 'private', 'shared'], default: 'public' },
    sharedWith: { type: [SharedWithSchema], required: false, default: [] },
    isPublic: { type: Boolean, required: true, default: true },
    archiveNumber: { type: String, required: false, default: '' },
    classificationCode: { type: String, required: false, default: 'UNCLASSIFIED' },
    lifecycleState: {
      type: String,
      required: true,
      enum: ['ACTIVE', 'INACTIVE', 'PERMANENT', 'DISPOSED'],
      default: 'ACTIVE'
    },
    storageTier: { type: String, required: true, enum: ['hot', 'cold'], default: 'hot' },
    lifecycleStateChangedAt: { type: Date, required: true, default: Date.now },
    retentionPolicyCode: { type: String, required: false, default: '' },
    retentionActiveUntil: { type: Date, required: false, default: null },
    retentionInactiveUntil: { type: Date, required: false, default: null },
    retentionReviewedAt: { type: Date, required: false, default: null },
    disposalEligibleAt: { type: Date, required: false, default: null },
    disposalNotifiedAt: { type: Date, required: false, default: null },
    dispositionAt: { type: Date, required: false, default: null },
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
    subcategory: { type: String, required: false, default: '' },
    accessLevel: { type: String, required: true, enum: ['BIASA', 'TERBATAS', 'RAHASIA'], default: 'BIASA' },
    archiveType: { type: String, required: true, enum: ['DINAMIS', 'STATIS'], default: 'DINAMIS' },
    extractedText: { type: String, required: false, default: '' },
    ocrStatus: {
      type: String,
      required: true,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending'
    },
    ocrError: { type: String, required: false, default: '' },
    ocrUpdatedAt: { type: Date, required: false, default: null },
    gdriveFileId: { type: String, required: false, default: '' },
    gdriveLink: { type: String, required: false, default: '' },
    gdriveSyncedAt: { type: Date, required: false, default: null },
    gdriveSyncError: { type: String, required: false, default: '' },
    trashedAt: { type: Date, required: false, default: null },
    trashedFromPath: { type: String, required: false, default: '' },
    type: { type: String, required: false, default: '' },
    description: { type: String, required: false, default: '' },
    tags: { type: [String], required: false, default: [] },
    status: { type: String, required: true, enum: ['active', 'deleted'], default: 'active' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ArchiveSchema.index({ filename: 1 });
ArchiveSchema.index({ checksumSha256: 1 });
ArchiveSchema.index({ 'uploadedBy.phone': 1 });
ArchiveSchema.index({ visibility: 1 });
ArchiveSchema.index({ 'sharedWith.userId': 1 });
ArchiveSchema.index({ archiveNumber: 1 });
ArchiveSchema.index({ classificationCode: 1 });
ArchiveSchema.index({ lifecycleState: 1 });
ArchiveSchema.index({ storageTier: 1 });
ArchiveSchema.index({ disposalEligibleAt: 1 });
ArchiveSchema.index({ docNumber: 1 });
ArchiveSchema.index({ docDate: -1 });
ArchiveSchema.index({ unit: 1 });
ArchiveSchema.index({ docKind: 1 });
ArchiveSchema.index({ unitSender: 1 });
ArchiveSchema.index({ unitRecipient: 1 });
ArchiveSchema.index({ title: 1 });
ArchiveSchema.index({ year: 1 });
ArchiveSchema.index({ category: 1 });
ArchiveSchema.index({ subcategory: 1 });
ArchiveSchema.index({ accessLevel: 1 });
ArchiveSchema.index({ archiveType: 1 });
ArchiveSchema.index({ gdriveFileId: 1 });
ArchiveSchema.index({ trashedAt: -1 });
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
