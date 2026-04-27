import mongoose, { Schema, model, models } from 'mongoose';

const BackupSettingSchema = new Schema(
  {
    singletonKey: { type: String, required: true, default: 'default', unique: true },
    enabled: { type: Boolean, required: true, default: false },
    cron: { type: String, required: true, default: '30 1 * * *' },
    keepLast: { type: Number, required: true, default: 14, min: 1, max: 365 },
    backupBaseDir: { type: String, required: true, default: '/home/fando/arsipkpu/backups' },
    projectDir: { type: String, required: true, default: '/home/fando/arsipkpu' },
    envFile: { type: String, required: true, default: '/home/fando/arsipkpu/.env.docker' },
    offsiteRemote: { type: String, default: '' },
    updatedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true }
    }
  },
  { timestamps: true }
);

export const BackupSetting = models.BackupSetting || model('BackupSetting', BackupSettingSchema);

export type BackupSettingDoc = mongoose.InferSchemaType<typeof BackupSettingSchema>;
