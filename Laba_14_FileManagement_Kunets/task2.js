// Лабораторная работа 14, Задание 2
// Создание структуры каталогов, info.txt, перемещение, переименование, удаление
// Вариант 10 — чётный → создаём README.md с датой в каждой папке

import fs from 'fs/promises';
import path from 'path';

const N = 10;
const root = path.join(process.cwd(), `project_${N}`);

// Рекурсивный вывод дерева
async function printTree(dir, prefix = '') {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    console.log(prefix + (e.isDirectory() ? '📁 ' : '📄 ') + e.name);
    if (e.isDirectory()) {
      await printTree(path.join(dir, e.name), prefix + '   ');
    }
  }
}

async function main() {
  try {
    // 1. Список папок
    const dirs = [
      'src',
      'src/modules',
      'src/components',
      'src/utils',
      'data',
      'data/input',
      'data/output',
    ];

    // 2. Создаём каждую + info.txt
    for (const d of dirs) {
      const full = path.join(root, d);
      await fs.mkdir(full, { recursive: true });
      await fs.writeFile(
        path.join(full, 'info.txt'),
        `Назначение папки: ${d}\n`,
        'utf-8'
      );
    }

    // 3. Доп. условие: N чётное → README.md с датой в каждой папке
    if (N % 2 === 0) {
      const now = new Date().toISOString();
      for (const d of dirs) {
        await fs.writeFile(
          path.join(root, d, 'README.md'),
          `Дата создания: ${now}\n`,
          'utf-8'
        );
      }
    }

    // Дополнительно: temp создаём в корне project_N (по логике задания)
    await fs.mkdir(path.join(root, 'temp'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'temp', 'info.txt'),
      'Назначение папки: temp (временная)\n',
      'utf-8'
    );
    if (N % 2 === 0) {
      await fs.writeFile(
        path.join(root, 'temp', 'README.md'),
        `Дата создания: ${new Date().toISOString()}\n`,
        'utf-8'
      );
    }

    console.log('\n=== Исходная структура ===');
    await printTree(root);

    // 4. Перемещаем temp внутрь data
    await fs.rename(path.join(root, 'temp'), path.join(root, 'data', 'temp'));

    // 5. Переименовываем data/output → data/results
    await fs.rename(
      path.join(root, 'data', 'output'),
      path.join(root, 'data', 'results')
    );

    // 6. Удаляем data/temp со всем содержимым
    await fs.rm(path.join(root, 'data', 'temp'), {
      recursive: true,
      force: true,
    });

    console.log('\n=== Обновлённая структура ===');
    await printTree(root);
  } catch (err) {
    console.error('Ошибка в задании 2:', err.message);
  }
}

main();