import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2] || 'c:/Users/roger/Downloads/Copy of PAPA_ FAPA Dallas 2025 Volunteers Sign Up.xlsx';
const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('Sheet names:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log('\n--- Sheet:', name, '---');
  console.log(JSON.stringify(data.slice(0, 30), null, 2));
}
