import mongoose, { Schema, model, models } from 'mongoose';

const UploadSettingSchema = new Schema(
  {
    singletonKey: { type: String, required: true, default: 'default', unique: true },
    maxFileSizeBytes: { type: Number, required: true, default: 104857600, min: 1, max: 2147483648 },
    allowedExtensions: { type: [String], required: true, default: [] },
    updatedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export const UploadSetting = models.UploadSetting || model('UploadSetting', UploadSettingSchema);

export type UploadSettingDoc = mongoose.InferSchemaType<typeof UploadSettingSchema>;

