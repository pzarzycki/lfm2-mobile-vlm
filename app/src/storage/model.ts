import RNFS from 'react-native-fs';

// Directory to store local model bundles
const MODELS_DIR = `${RNFS.DocumentDirectoryPath}/models`;

export const MODEL_450M = 'lfm2-vl-450m.bundle';
export const MODEL_1_6B = 'LFM2-VL-1_6B_8da4w.bundle';
export const MODEL_450M_URL =
  'https://huggingface.co/LiquidAI/LeapBundles/resolve/main/LFM2-VL-450M_8da4w.bundle';
export const MODEL_1_6B_URL =
  'https://huggingface.co/LiquidAI/LeapBundles/resolve/main/LFM2-VL-1_6B_8da4w.bundle';

export async function ensureModelsDir(): Promise<string> {
  const exists = await RNFS.exists(MODELS_DIR);
  if (!exists) {
    await RNFS.mkdir(MODELS_DIR);
  }
  return MODELS_DIR;
}

export async function modelPath(fileName: string): Promise<string> {
  const dir = await ensureModelsDir();
  return `${dir}/${fileName}`;
}

export async function isModelDownloaded(fileName: string): Promise<boolean> {
  const p = await modelPath(fileName);
  return RNFS.exists(p);
}

export type DownloadOptions = {
  onProgress?: (pct: number) => void;
};

async function downloadTo(url: string, dest: string, opts: DownloadOptions = {}): Promise<string> {
  const exists = await RNFS.exists(dest);
  if (exists) return dest;

  // Temporary file path during download
  const temp = `${dest}.download`;
  if (await RNFS.exists(temp)) {
    // Clean up any previous interrupted download
    try { await RNFS.unlink(temp); } catch {}
  }

  const dl = RNFS.downloadFile({
    fromUrl: url,
    toFile: temp,
    progressDivider: 10,
    progress: (p: { bytesWritten: number; contentLength: number }) => {
      const pct = p.contentLength > 0 ? Math.round((p.bytesWritten / p.contentLength) * 100) : 0;
      opts.onProgress?.(Math.max(0, Math.min(100, pct)));
    },
  });

  const res = await dl.promise;
  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
    await RNFS.moveFile(temp, dest);
    return dest;
  }
  // Clean up on failure
  try { await RNFS.unlink(temp); } catch {}
  throw new Error(`Model download failed (status ${res.statusCode ?? 'unknown'})`);
}

// Download and persist the 450M model; returns absolute file path when done.
export async function downloadLfm2Small(opts: DownloadOptions = {}): Promise<string> {
  const dest = await modelPath(MODEL_450M);
  return downloadTo(MODEL_450M_URL, dest, opts);
}

// Download and persist the 1.6B model; returns absolute file path when done.
export async function downloadLfm2Large(opts: DownloadOptions = {}): Promise<string> {
  const dest = await modelPath(MODEL_1_6B);
  return downloadTo(MODEL_1_6B_URL, dest, opts);
}

export async function localModelPathOrThrow(fileName: string): Promise<string> {
  const p = await modelPath(fileName);
  const ok = await RNFS.exists(p);
  if (!ok) throw new Error(`Model ${fileName} not found locally. Please download it first.`);
  return p;
}

export async function missingModels(): Promise<string[]> {
  const miss: string[] = [];
  if (!(await isModelDownloaded(MODEL_450M))) miss.push(MODEL_450M);
  if (!(await isModelDownloaded(MODEL_1_6B))) miss.push(MODEL_1_6B);
  return miss;
}

export async function areAllModelsDownloaded(): Promise<boolean> {
  const m = await missingModels();
  return m.length === 0;
}

