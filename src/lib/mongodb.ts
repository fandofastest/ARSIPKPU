import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ?? '';

if (!MONGODB_URI) {
  throw new Error('Missing MONGODB_URI env var');
}

type MongooseGlobal = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { mongoose: MongooseGlobal };

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}

export async function dbConnect(): Promise<typeof mongoose> {
  if (globalForMongoose.mongoose.conn) return globalForMongoose.mongoose.conn;

  if (!globalForMongoose.mongoose.promise) {
    globalForMongoose.mongoose.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false
      })
      .then((m: typeof mongoose) => m);
  }

  globalForMongoose.mongoose.conn = await globalForMongoose.mongoose.promise;
  return globalForMongoose.mongoose.conn;
}
