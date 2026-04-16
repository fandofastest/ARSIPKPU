import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const CategorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    parentSlug: { type: String, required: false, default: '' },
    path: { type: String, required: true },
    level: { type: Number, required: true, default: 0 },
    description: { type: String, required: false, default: '' },
    createdBy: {
      userId: { type: Schema.Types.ObjectId, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true }
    },
    status: { type: String, required: true, enum: ['active', 'deleted'], default: 'active' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ path: 1 }, { unique: true });
CategorySchema.index({ name: 1 });
CategorySchema.index({ parentSlug: 1, name: 1 });
CategorySchema.index({ status: 1 });
CategorySchema.index({ createdAt: -1 });

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const Category: Model<CategoryDocument> =
  (mongoose.models.Category as Model<CategoryDocument>) || mongoose.model<CategoryDocument>('Category', CategorySchema);
