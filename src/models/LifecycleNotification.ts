import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const LifecycleNotificationSchema = new Schema(
  {
    type: { type: String, required: true, enum: ['disposal_eligible'], default: 'disposal_eligible' },
    archiveId: { type: Schema.Types.ObjectId, required: true, index: true },
    classificationCode: { type: String, required: false, default: '' },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 2000 },
    forRoles: { type: [String], required: true, default: ['admin'] },
    readBy: {
      type: [
        new Schema(
          {
            userId: { type: String, required: true },
            at: { type: Date, required: true, default: Date.now }
          },
          { _id: false }
        )
      ],
      required: true,
      default: []
    }
  },
  { timestamps: true }
);

LifecycleNotificationSchema.index({ createdAt: -1 });
LifecycleNotificationSchema.index({ type: 1, createdAt: -1 });

export type LifecycleNotificationDoc = InferSchemaType<typeof LifecycleNotificationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LifecycleNotification: Model<LifecycleNotificationDoc> =
  (mongoose.models.LifecycleNotification as Model<LifecycleNotificationDoc>) ||
  mongoose.model<LifecycleNotificationDoc>('LifecycleNotification', LifecycleNotificationSchema);
