import path from 'node:path';
import fs from 'node:fs';

const cwd = process.cwd();
const envLocalPath = path.resolve(cwd, '.env.local');
const envPath = path.resolve(cwd, '.env');
const envFilePath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envFilePath });

  const { dbConnect } = await import('../src/lib/mongodb');
  const { processPendingOcrBatch } = await import('../src/lib/ocr');

  const pollMs = Math.max(500, Number(process.env.OCR_WORKER_POLL_MS ?? '3000'));
  const idleBackoffMs = Math.max(pollMs, Number(process.env.OCR_WORKER_IDLE_BACKOFF_MS ?? '5000'));
  const batchLimit = Math.max(1, Math.min(20, Number(process.env.OCR_WORKER_BATCH_LIMIT ?? '10')));

  let isStopping = false;
  const stop = () => {
    isStopping = true;
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  await dbConnect();
  console.log(`[ocr-worker] started. batchLimit=${batchLimit} pollMs=${pollMs} idleBackoffMs=${idleBackoffMs}`);

  while (!isStopping) {
    try {
      const r = await processPendingOcrBatch(batchLimit);
      const hasWork = r.picked > 0;
      if (hasWork) {
        console.log(
          `[ocr-worker] picked=${r.picked} processed=${r.processed} failed=${r.failed} skipped=${r.skipped}`
        );
        await sleep(pollMs);
      } else {
        await sleep(idleBackoffMs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[ocr-worker] error: ${msg}`);
      await sleep(idleBackoffMs);
    }
  }

  console.log('[ocr-worker] stopping...');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
