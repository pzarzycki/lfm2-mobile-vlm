import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

// App-private data directory (removed on uninstall; no extra permissions required)
// Android -> /data/data/<bundle>/files (internal) or similar app sandbox
// iOS -> NSDocumentDirectory (if iOS added later)
const DATA_DIR = `${RNFS.DocumentDirectoryPath}/data`;

export type CsvName = 'receipts.csv' | 'transactions.csv';

export async function ensureDataDir(): Promise<string> {
  const exists = await RNFS.exists(DATA_DIR);
  if (!exists) {
    await RNFS.mkdir(DATA_DIR);
  }
  return DATA_DIR;
}

export async function dataPath(name: CsvName): Promise<string> {
  const dir = await ensureDataDir();
  return `${dir}/${name}`;
}

export async function readCsv(name: CsvName): Promise<string> {
  const p = await dataPath(name);
  const exists = await RNFS.exists(p);
  if (!exists) return '';
  return RNFS.readFile(p, 'utf8');
}

export async function writeCsv(name: CsvName, content: string): Promise<void> {
  const p = await dataPath(name);
  await RNFS.writeFile(p, content, 'utf8');
}

export async function appendCsv(name: CsvName, line: string): Promise<void> {
  const p = await dataPath(name);
  const exists = await RNFS.exists(p);
  const text = line.endsWith('\n') ? line : `${line}\n`;
  if (!exists) {
    await RNFS.writeFile(p, text, 'utf8');
  } else {
    await RNFS.appendFile(p, text, 'utf8');
  }
}

// Optional: seed CSVs from bundled Android assets on first run
// Place seed files under android/app/src/main/assets/seed/<file>.csv
export async function seedFromAssetsIfMissing(name: CsvName): Promise<boolean> {
  const p = await dataPath(name);
  const exists = await RNFS.exists(p);
  if (exists) return false;
  if (Platform.OS === 'android') {
    try {
      const assetPath = `seed/${name}`;
      const content = await RNFS.readFileAssets(assetPath, 'utf8');
      await RNFS.writeFile(p, content, 'utf8');
      return true;
    } catch {
      // asset not present; ignore
    }
  }
  return false;
}

// If you prefer files visible to users (export/share), use ExternalDirectoryPath
// Android path: /storage/emulated/0/Android/data/<bundle>/files (still app-scoped)
// export const EXPORT_DIR = `${RNFS.ExternalDirectoryPath}/exports`;
