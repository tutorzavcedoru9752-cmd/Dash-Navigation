import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const argValue = (name, fallback) => {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
};

const count = Number.parseInt(argValue('count', '20'), 10);
const batch = argValue('batch', `xianyu_${new Date().toISOString().slice(0, 10).replace(/-/g, '_')}_lifetime_5_99`);
const source = argValue('source', 'xianyu_lifetime_5_99');

if (!Number.isInteger(count) || count < 1 || count > 10000) {
  throw new Error('Use --count with a value from 1 to 10000.');
}

const normalizeCode = (code) => code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const hashCode = (code) => createHash('sha256').update(normalizeCode(code)).digest('hex');

const randomCode = () => {
  const bytes = randomBytes(12);
  const chars = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `JF-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8, 12).join('')}`;
};

const codes = new Set();
while (codes.size < count) {
  codes.add(randomCode());
}

const outDir = join(process.cwd(), 'generated-membership-codes');
mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const csvPath = join(outDir, `${batch}-${timestamp}.csv`);
const sqlPath = join(outDir, `${batch}-${timestamp}.sql`);

const csvRows = ['code,batch_name,source'];
const sqlValues = [];

for (const code of codes) {
  csvRows.push(`${code},${batch},${source}`);
  sqlValues.push(`('${hashCode(code)}', '${source.replaceAll("'", "''")}', '${batch.replaceAll("'", "''")}')`);
}

const sql = `insert into public.membership_codes (code_hash, source, batch_name)\nvalues\n  ${sqlValues.join(',\n  ')}\non conflict (code_hash) do nothing;\n`;

writeFileSync(csvPath, `${csvRows.join('\n')}\n`, 'utf8');
writeFileSync(sqlPath, sql, 'utf8');

console.log(`Generated ${count} membership codes.`);
console.log(`Plaintext CSV for Xianyu: ${csvPath}`);
console.log(`Hashed SQL for Supabase: ${sqlPath}`);
console.log('Do not commit files under generated-membership-codes/.');
