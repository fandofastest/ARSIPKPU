import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const AuditUserSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, required: true }
  },
  { _id: false }
);

const AuditArchiveSchema = new Schema(
  {
    archiveId: { type: Schema.Types.ObjectId, required: false, default: null },
    archiveNumber: { type: String, required: false, default: '' },
    originalName: { type: String, required: false, default: '' }
  },
  { _id: false }
);

const AuditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'upload',
        'update',
        'delete',
        'download',
        'preview',
        'export',
        'login',
        'category_create',
        'category_update',
        'category_delete'
      ]
    },
    user: { type: AuditUserSchema, required: true },
    archive: { type: AuditArchiveSchema, required: true },
    ip: { type: String, required: false, default: '' },
    userAgent: { type: String, required: false, default: '' },
    meta: { type: Schema.Types.Mixed, required: false, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ 'user.phone': 1, createdAt: -1 });
AuditLogSchema.index({ 'archive.archiveNumber': 1, createdAt: -1 });
AuditLogSchema.index({ 'archive.archiveId': 1, createdAt: -1 });

export type AuditLogDocument = InferSchemaType<typeof AuditLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const AuditLog: Model<AuditLogDocument> =
  (mongoose.models.AuditLog as Model<AuditLogDocument>) || mongoose.model<AuditLogDocument>('AuditLog', AuditLogSchema);
