import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

export type UserRole = 'admin' | 'staff' | 'viewer';

const UserSchema = new Schema(
  {
    nama: { type: String, required: false, trim: true, default: '' },
    name: { type: String, required: true, trim: true },
    nip: { type: String, required: false, unique: true, sparse: true, index: true, trim: true },
    golongan: { type: String, required: false, trim: true, maxlength: 20 },
    jabatan: { type: String, required: false, trim: true, maxlength: 120 },
    phone: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, required: false, unique: true, sparse: true, lowercase: true, trim: true },
    gender: { type: String, required: false, enum: ['male', 'female', 'other'] },
    address: { type: String, required: false, trim: true, maxlength: 500 },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'staff', 'viewer'] },
    unit: { type: String, required: false, trim: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
};

export const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>('User', UserSchema);
