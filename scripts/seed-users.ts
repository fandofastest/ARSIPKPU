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

  const csvPath = path.resolve(cwd, 'daftar_hadir_kpu_dumai.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');

  let successCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      if (line[j] === '"') {
        inQuotes = !inQuotes;
      } else if (line[j] === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += line[j];
      }
    }
    row.push(current.trim());

    const [nama, nip, pangkat, golongan, jabatan] = row;

    if (!nip) {
        console.warn(`Baris ${i + 1} tidak memiliki NIP, diabaikan.`);
        continue;
    }

    const passwordHash = await bcrypt.hash(nip, 12);
    
    const isRifando = nama.toUpperCase() === 'RIFANDO PANGGABEAN';
    // RIFANDO selalu admin, yang lain staff
    const role = isRifando ? 'admin' : 'staff';

    try {
      let existing = await User.findOne({ nip });
      
      if (!existing) {
        // Cek juga berdasarkan phone karena menggunakan nip sebagai phone
        existing = await User.findOne({ phone: nip });
      }

      if (existing) {
        existing.nama = nama;
        existing.name = nama;
        existing.golongan = golongan;
        existing.jabatan = jabatan;
        existing.password = passwordHash;
        
        // Pastikan RIFANDO PANGGABEAN tetap admin
        if (isRifando) {
            existing.role = 'admin';
        } else {
            // Jika user lain dan role belum ada, default ke staff
            if (!existing.role) existing.role = 'staff';
        }
        
        await existing.save();
        console.log(`Updated: ${nama} (${nip})`);
      } else {
        await User.create({
          nama,
          name: nama,
          nip,
          phone: nip, // Phone required dan unique, jadi pake NIP
          golongan,
          jabatan,
          password: passwordHash,
          role
        });
        console.log(`Created: ${nama} (${nip})`);
      }
      successCount++;
    } catch (err) {
      console.error(`Gagal memproses ${nama} (${nip}):`, err);
    }
  }

  console.log(`\n=== SEED SELESAI ===`);
  console.log(`Berhasil memproses ${successCount} user.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
