import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envPath = path.resolve(cwd, '.env');
const envFilePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envFilePath });

  const { dbConnect } = await import('../src/lib/mongodb');
  const { User } = await import('../src/models/User');

  await dbConnect();

  const phone = '081234567890';

  const existing = await User.findOne({ phone });
  if (existing) {
    console.log('Admin user already exists:', phone);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash('admin123', 12);

  await User.create({
    name: 'Administrator',
    phone,
    password: passwordHash,
    role: 'admin'
  });

  console.log('Seed completed. Created admin:', phone);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
