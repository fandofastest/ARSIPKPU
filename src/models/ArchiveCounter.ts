import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const ArchiveCounterSchema = new Schema(
  {
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 }
  },
  { timestamps: { createdAt: false, updatedAt: false } }
);

ArchiveCounterSchema.index({ year: 1 }, { unique: true });

export type ArchiveCounterDocument = InferSchemaType<typeof ArchiveCounterSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ArchiveCounter: Model<ArchiveCounterDocument> =
  (mongoose.models.ArchiveCounter as Model<ArchiveCounterDocument>) ||
  mongoose.model<ArchiveCounterDocument>('ArchiveCounter', ArchiveCounterSchema);
