#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../../backups', timestamp);

  // Create backup directory
  fs.mkdirSync(backupDir, { recursive: true });

  try {
    // Backup laws table
    const { data: laws, error: lawsError } = await supabase
      .from('laws')
      .select('*');
    if (lawsError) throw lawsError;
    fs.writeFileSync(path.join(backupDir, 'laws.json'), JSON.stringify(laws, null, 2));

    // Backup query_logs table
    const { data: queryLogs, error: logsError } = await supabase
      .from('query_logs')
      .select('*');
    if (logsError) throw logsError;
    fs.writeFileSync(path.join(backupDir, 'query_logs.json'), JSON.stringify(queryLogs, null, 2));

    // Backup profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    if (profilesError) throw profilesError;
    fs.writeFileSync(path.join(backupDir, 'profiles.json'), JSON.stringify(profiles, null, 2));

    console.log(`✅ Backup completed successfully at ${backupDir}`);
    
    // Cleanup old backups (keep last 7 days)
    const backupsRoot = path.join(__dirname, '../../backups');
    const backups = fs.readdirSync(backupsRoot);
    const oldBackups = backups
      .map(b => ({ name: b, time: fs.statSync(path.join(backupsRoot, b)).mtime }))
      .sort((a, b) => b.time - a.time)
      .slice(7);

    oldBackups.forEach(backup => {
      fs.rmSync(path.join(backupsRoot, backup.name), { recursive: true });
      console.log(`🗑️ Removed old backup: ${backup.name}`);
    });

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

backupDatabase();