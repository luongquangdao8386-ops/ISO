// Nạp SheetJS (vendor) trong Node cho test: tệp UMD chạy trong vm, lấy XLSX
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let X = null;
export function xlsx() {
  if (X) return X;
  const box = {};
  box.self = box; box.window = box;
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'vendor', 'xlsx-0.20.3.full.min.js'), 'utf8'), box);
  X = box.XLSX;
  return X;
}
