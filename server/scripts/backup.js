const { supabase } = require('../config/db');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');

const TABLES = ['products', 'orders', 'customers', 'expenses', 'activity_logs'];

async function runBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const backup = { timestamp: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    try {
      const { data } = await supabase.from(table).select('*');
      backup.tables[table] = data || [];
      console.log(`  ✓ ${table}: ${(data || []).length} rows`);
    } catch (err) {
      console.log(`  ✗ ${table}: ${err.message}`);
      backup.tables[table] = [];
    }
  }

  const filename = `backup-${Date.now()}.json`;
  fs.writeFileSync(path.join(BACKUP_DIR, filename), JSON.stringify(backup, null, 2));
  console.log(`\n✅ Backup saved: ${filename}`);
  return { filename, size: backup.tables };
}

if (require.main === module) {
  runBackup().catch(console.error);
}

module.exports = { runBackup };
