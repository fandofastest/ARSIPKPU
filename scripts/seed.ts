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

  const nip = '000000000000000000';
  const phone = '081234567890';

  const passwordHash = await bcrypt.hash('admin123', 12);

  const existing = await User.findOne({ $or: [{ nip }, { phone }] });
  if (existing) {
    existing.name = 'Administrator';
    (existing as { nama?: string }).nama = 'Administrator';
    (existing as { nip?: string }).nip = nip;
    existing.phone = phone;
    existing.password = passwordHash;
    existing.role = 'admin';
    await existing.save();
    console.log('Seed completed. Updated admin:', nip);
    process.exit(0);
  }

  await User.create({ name: 'Administrator', nama: 'Administrator', nip, phone, password: passwordHash, role: 'admin' });
  console.log('Seed completed. Created admin:', nip);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
