import { readFileSync } from 'node:fs';
import { planClientInstall, applyClientInstall } from '../src/client-installer.js';
const request = JSON.parse(readFileSync(process.argv[2], 'utf8'));
applyClientInstall(planClientInstall(request), { beforeWrite: (index) => { if (index === 2) process.exit(77); } });
