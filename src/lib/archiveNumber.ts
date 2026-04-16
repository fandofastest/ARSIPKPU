import { ArchiveCounter } from '@/models/ArchiveCounter';

function pad5(n: number) {
  return String(n).padStart(5, '0');
}

export async function reserveArchiveNumbers(year: number, count: number) {
  const y = Math.trunc(year);
  const c = Math.max(1, Math.trunc(count));

  const updated = await ArchiveCounter.findOneAndUpdate(
    { year: y },
    { $inc: { seq: c } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const end = updated.seq;
  const start = end - c + 1;

  const numbers: string[] = [];
  for (let i = start; i <= end; i += 1) {
    numbers.push(`ARSIP-${y}-${pad5(i)}`);
  }

  return numbers;
}
