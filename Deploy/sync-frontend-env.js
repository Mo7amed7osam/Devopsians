'use strict';
// Sync frontend env files from Deploy/ based on target environment.
// Usage: node Deploy/sync-frontend-env.js [local|production|staging]

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targetEnv = (process.argv[2] || process.env.TARGET_ENV || 'local').toLowerCase();

const envMap = {
  local: {
    source: path.join(__dirname, '.env.development'),
    targets: [
      path.join(root, 'frontend', '.env'),
      path.join(root, 'frontend', '.env.local'),
    ],
  },
  production: {
    source: path.join(__dirname, '.env.production'),
    targets: [path.join(root, 'frontend', '.env.production')],
  },
  staging: {
    source: path.join(__dirname, '.env.staging'),
    targets: [
      path.join(root, 'frontend', '.env.staging'),
      path.join(root, 'frontend', '.env.production'),
    ],
  },
};

if (!envMap[targetEnv]) {
  console.error(`Unknown env '${targetEnv}'. Use one of: ${Object.keys(envMap).join(', ')}`);
  process.exit(1);
}

const { source, targets } = envMap[targetEnv];

if (!fs.existsSync(source)) {
  console.error(`Source env file not found: ${source}`);
  process.exit(1);
}

try {
  targets.forEach((dest) => {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${path.basename(source)} -> ${dest}`);
  });
  console.log(`Frontend env synced for '${targetEnv}'.`);
} catch (err) {
  console.error(`Failed to sync envs: ${err.message}`);
  process.exit(1);
}
