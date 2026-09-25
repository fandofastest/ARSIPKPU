import mongoose, { Schema, model, models } from 'mongoose';

const GDriveSettingSchema = new Schema(
  {
    singletonKey: { type: String, required: true, default: 'default', unique: true },
    enabled: { type: Boolean, required: true, default: false },
    authType: { type: String, enum: ['oauth', 'service_account'], default: 'oauth' },
    clientId: { type: String, default: '' },
    clientSecret: { type: String, default: '' },
    refreshToken: { type: String, default: '' },
    folderId: { type: String, default: '' },
    serviceAccountEmail: { type: String, default: '' },
    privateKey: { type: String, default: '' },
    shareMode: { type: String, enum: ['anyone', 'domain', 'private'], default: 'anyone' },
    shareDomain: { type: String, default: '' },
    updatedBy: {
      userId: { type: String },
      name: { type: String },
      phone: { type: String }
    }
  },
  { timestamps: true }
);

export const GDriveSetting = models.GDriveSetting || model('GDriveSetting', GDriveSettingSchema);

export type GDriveSettingDoc = mongoose.InferSchemaType<typeof GDriveSettingSchema>;
