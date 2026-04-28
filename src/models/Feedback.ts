import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const FeedbackSchema = new Schema(
  {
    category: { type: String, required: true, enum: ['kritik', 'saran', 'bug', 'fitur', 'lainnya'], default: 'saran' },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    rating: { type: Number, required: false, min: 1, max: 5, default: null },
    status: { type: String, required: true, enum: ['new', 'reviewed', 'resolved'], default: 'new' },
    submittedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      role: { type: String, required: true }
    },
    reviewedBy: {
      userId: { type: String, required: false, default: '' },
      name: { type: String, required: false, default: '' },
      phone: { type: String, required: false, default: '' }
    },
    reviewedAt: { type: Date, required: false, default: null },
    attachments: [{ type: String, required: false, default: [] }]
  },
  { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ status: 1, createdAt: -1 });
FeedbackSchema.index({ 'submittedBy.userId': 1, createdAt: -1 });

export type FeedbackDoc = InferSchemaType<typeof FeedbackSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Feedback: Model<FeedbackDoc> =
  (mongoose.models.Feedback as Model<FeedbackDoc>) || mongoose.model<FeedbackDoc>('Feedback', FeedbackSchema);
