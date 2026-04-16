import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const OcrLogSchema = new Schema(
  {
    archiveId: { type: Schema.Types.ObjectId, required: true, index: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    status: { type: String, required: true, enum: ['processing', 'done', 'failed', 'skipped'], index: true },
    message: { type: String, required: false, default: '' },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: false, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OcrLogSchema.index({ createdAt: -1 });

export type OcrLogDocument = InferSchemaType<typeof OcrLogSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const OcrLog: Model<OcrLogDocument> =
  (mongoose.models.OcrLog as Model<OcrLogDocument>) || mongoose.model<OcrLogDocument>('OcrLog', OcrLogSchema);
