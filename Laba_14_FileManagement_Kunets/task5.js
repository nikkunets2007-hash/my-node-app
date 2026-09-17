// Лабораторная работа 14, Задание 5
// Копирование source_10 → backup_10, синхронизация, отчёт sync_report_10.txt
// Доп. условие варианта 10: MD5-суммы для файлов > 500 КБ

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

const N = 10;
const srcDir = path.join(process.cwd(), `source_${N}`);
const dstDir = path.join(process.cwd(), `backup_${N}`);

const TEXT_EXT = ['.txt', '.js', '.json'];
const IMG_EXT = ['.jpg', '.png', '.gif'];
const HASH_THRESHOLD = 500 * 1024; // 500 КБ

// MD5 файла
async function md5(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(file);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Копирование через поток
async function copyStream(src, dst) {
  await pipeline(fs.createReadStream(src), fs.createWriteStream(dst));
}

// Копирование чанками по 512 КБ (файлы > 1 МБ)
async function copyChunked(src, dst) {
  await pipeline(
    fs.createReadStream(src, { highWaterMark: 512 * 1024 }),
    fs.createWriteStream(dst)
  );
}

// Рекурсивное копирование
async function copyRecursive(src, dst, report) {
  await fsp.mkdir(dst, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);

    if (e.isDirectory()) {
      await copyRecursive(s, d, report);
    } else {
      const stat = await fsp.stat(s);
      const ext = path.extname(e.name).toLowerCase();

      let mode = 'stream';
      if (stat.size > 1024 * 1024) {
        await copyChunked(s, d);
        mode = 'chunked (512KB)';
      } else if (TEXT_EXT.includes(ext)) {
        await copyStream(s, d);
        mode = 'stream';
      } else if (IMG_EXT.includes(ext)) {
        await fsp.copyFile(s, d);
        mode = 'copyFile';
      } else {
        await copyStream(s, d);
      }

      // Доп. условие: MD5 для файлов > 500 КБ
      if (stat.size > HASH_THRESHOLD) {
        const srcHash = await md5(s);
        const dstHash = await md5(d);
        report.hashes.push({
          file: path.relative(srcDir, s),
          size: stat.size,
          md5: srcHash,
          match: srcHash === dstHash,
        });
      }

      report.copied.push({ file: path.relative(srcDir, s), size: stat.size, mode });
      console.log(`  ✔ ${path.relative(srcDir, s)} [${mode}]`);
    }
  }
}

// 1. Создание тестовой структуры
async function createTestStructure() {
  await fsp.rm(srcDir, { recursive: true, force: true });
  await fsp.mkdir(srcDir, { recursive: true });

  const exts = ['.txt', '.js', '.json', '.jpg', '.png', '.gif', '.md', '.css'];
  const manifest = [];

  for (let i = 1; i <= 20; i++) {
    const ext = exts[i % exts.length];
    const name = `file${i}${ext}`;
    const size = Math.floor(Math.random() * 2 * 1024 * 1024); // до 2 МБ
    await fsp.writeFile(path.join(srcDir, name), 'x'.repeat(size));
    manifest.push({ name, size, ext });
  }

  for (let i = 1; i <= 3; i++) {
    const sub = path.join(srcDir, `sub${i}`);
    await fsp.mkdir(sub, { recursive: true });
    await fsp.writeFile(path.join(sub, `inner${i}.txt`), 'hello world', 'utf-8');
    manifest.push({ name: `sub${i}/inner${i}.txt`, size: 11, ext: '.txt' });
  }

  await fsp.writeFile(
    path.join(srcDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8'
  );

  console.log(`Создана тестовая структура: ${srcDir}\n`);
}

// 2. Сравнение директорий
async function syncDirs() {
  const report = { added: [], deleted: [], modified: [], same: [] };

  async function walk(dir, base = '') {
    const map = {};
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const rel = path.join(base, e.name);
        if (e.isDirectory()) {
          Object.assign(map, await walk(path.join(dir, e.name), rel));
        } else {
          const stat = await fsp.stat(path.join(dir, e.name));
          map[rel] = { size: stat.size, mtime: stat.mtimeMs };
        }
      }
    } catch {}
    return map;
  }

  const srcFiles = await walk(srcDir);
  const dstFiles = await walk(dstDir);

  for (const [rel, info] of Object.entries(srcFiles)) {
    if (!dstFiles[rel]) report.added.push(rel);
    else if (dstFiles[rel].size !== info.size) report.modified.push(rel);
    else report.same.push(rel);
  }
  for (const rel of Object.keys(dstFiles)) {
    if (!srcFiles[rel]) report.deleted.push(rel);
  }

  const lines = [
    `Сравнение директорий: source_${N} и backup_${N}`,
    `- Совпадают: ${report.same.length}`,
    `- Изменены: ${report.modified.length}`,
    `- Добавлены: ${report.added.length}`,
    `- Удалены: ${report.deleted.length}`,
    '',
    'Изменённые файлы:',
    ...report.modified,
    'Добавленные файлы:',
    ...report.added,
    'Удалённые файлы:',
    ...report.deleted,
  ];

  await fsp.writeFile(`sync_report_${N}.txt`, lines.join('\n'), 'utf-8');
  console.log('\n' + lines.join('\n'));
  console.log(`\nОтчет сохранен: sync_report_${N}.txt`);
}

async function main() {
  const copyReport = { copied: [], hashes: [] };

  console.log('=== Создание тестовой структуры ===');
  await createTestStructure();

  console.log('=== Копирование ===');
  const start = Date.now();
  await copyRecursive(srcDir, dstDir, copyReport);
  console.log(
    `\nКопирование завершено! Файлов: ${copyReport.copied.length}, ` +
      `время: ${((Date.now() - start) / 1000).toFixed(2)} сек`
  );

  if (copyReport.hashes.length) {
    console.log('\nMD5 для файлов > 500 КБ:');
    copyReport.hashes.forEach((h) =>
      console.log(`  ${h.file} → ${h.md5} (совпадает: ${h.match})`)
    );
  }

  console.log('\n=== Синхронизация ===');
  await syncDirs();
}

main().catch((err) => console.error('Ошибка в задании 5:', err.message));