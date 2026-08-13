const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const projectDir = path.resolve(__dirname, '..');
const electronExe = require('electron');
const electronDist = path.dirname(electronExe);
const releaseDir = path.join(projectDir, 'release');
const outputDir = path.join(releaseDir, 'MoriCamp-Windows');
const archivePath = path.join(releaseDir, 'MoriCamp-Windows-1.0.0.zip');
const appDir = path.join(outputDir, 'resources', 'app');

fs.rmSync(outputDir, { recursive: true, force: true });
fs.rmSync(archivePath, { force: true });
fs.mkdirSync(appDir, { recursive: true });

fs.cpSync(electronDist, outputDir, { recursive: true });
fs.renameSync(
  path.join(outputDir, 'electron.exe'),
  path.join(outputDir, 'Mori Camp.exe'),
);

fs.cpSync(path.join(projectDir, 'dist'), path.join(appDir, 'dist'), {
  recursive: true,
});
fs.cpSync(path.join(projectDir, 'electron'), path.join(appDir, 'electron'), {
  recursive: true,
});

fs.writeFileSync(
  path.join(appDir, 'package.json'),
  `${JSON.stringify(
    {
      name: 'mori-camp-threejs',
      version: '1.0.0',
      productName: 'Mori Camp',
      main: 'electron/main.cjs',
    },
    null,
    2,
  )}\n`,
);

execFileSync(
  'tar.exe',
  ['-a', '-c', '-f', archivePath, '-C', releaseDir, 'MoriCamp-Windows'],
  { stdio: 'inherit' },
);

console.log(`Windows build created: ${path.join(outputDir, 'Mori Camp.exe')}`);
console.log(`Portable archive created: ${archivePath}`);
