// Лабораторная работа 14, Задание 3
// Рекурсивный обход директории, статистика, отчёт report_10.json
// Доп. условие варианта 10: игнорировать node_modules и .git

import fs from 'fs/promises';
import path from 'path';

const N = 10;
const targetDir = path.resolve(process.argv[2] || process.cwd());
const IGNORE = ['node_modules', '.git'];

const stats = {
  files: 0,
  dirs: 0,
  totalSize: 0,
  byExt: {},
  allFiles: [],
};

// Форматирование размера
function fmtSize(b) {
  if (b < 1024) return `${b} Б`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(2)} КБ`;
  return `${(b / 1024 / 1024).toFixed(2)} МБ`;
}

async function scan(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (IGNORE.includes(e.name)) continue; // доп. условие

    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      stats.dirs++;
      await scan(full);
    } else {
      try {
        const s = await fs.stat(full);
        stats.files++;
        stats.totalSize += s.size;
        const ext = path.extname(e.name) || 'no-ext';
        if (!stats.byExt[ext]) stats.byExt[ext] = { count: 0, size: 0 };
        stats.byExt[ext].count++;
        stats.byExt[ext].size += s.size;
        stats.allFiles.push({ name: e.name, path: full, size: s.size });
      } catch {}
    }
  }
}

async function main() {
  try {
    await scan(targetDir);

    const sorted = [...stats.allFiles].sort((a, b) => b.size - a.size);
    const top5big = sorted.slice(0, 5);
    const top5small = sorted.slice(-5).reverse();

    console.log(`Анализ директории: ${targetDir}\n`);
    console.log(`Общее количество папок: ${stats.dirs}`);
    console.log(`Общее количество файлов: ${stats.files}`);
    console.log(
      `Общий размер: ${fmtSize(stats.totalSize)} (${stats.totalSize} байт)\n`
    );

    console.log('Расширения файлов:');
    for (const [ext, v] of Object.entries(stats.byExt)) {
      console.log(`  ${ext}: ${v.count} файлов (${fmtSize(v.size)})`);
    }

    console.log('\nТоп-5 самых больших файлов:');
    top5big.forEach((f, i) =>
      console.log(`  ${i + 1}. ${f.name} (${fmtSize(f.size)}) - ${f.path}`)
    );

    console.log('\nТоп-5 самых маленьких файлов:');
    top5small.forEach((f, i) =>
      console.log(`  ${i + 1}. ${f.name} (${fmtSize(f.size)}) - ${f.path}`)
    );

    const report = {
      scannedDir: targetDir,
      totalDirs: stats.dirs,
      totalFiles: stats.files,
      totalSizeBytes: stats.totalSize,
      totalSizeHuman: fmtSize(stats.totalSize),
      byExtension: stats.byExt,
      top5Biggest: top5big,
      top5Smallest: top5small,
    };

    await fs.writeFile(
      `report_${N}.json`,
      JSON.stringify(report, null, 2),
      'utf-8'
    );
    console.log(`\nОтчет сохранен: report_${N}.json`);
  } catch (err) {
    console.error('Ошибка в задании 3:', err.message);
  }
}

main();