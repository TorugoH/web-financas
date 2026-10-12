const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const result = spawnSync('C:/Users/KABUM/AppData/Local/OpenAI/Codex/bin/bffc5354119c8421/codex.exe', ['--codex-run-as-apply-patch', fs.readFileSync(process.argv[2], 'utf8')], { stdio: 'inherit', windowsHide: true });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
