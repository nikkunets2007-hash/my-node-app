// Лабораторная работа 14, Задание 1
// Создание файла student_10.txt, запись данных, добавление строки, чтение
// Используем только асинхронные методы fs.promises + path

import fs from 'fs/promises';
import path from 'path';

const N = 10; // номер варианта

async function main() {
  // Формируем путь относительно текущей директории (lab14)
  const filePath = path.join(process.cwd(), `student_${N}.txt`);

  try {
    // 1. Готовим содержимое файла
    const now = new Date().toLocaleString('ru-RU');
    const books = [
      '1. "Война и мир" - Л. Толстой',
      '2. "Преступление и наказание" - Ф. Достоевский',
      '3. "Мастер и Маргарита" - М. Булгаков',
      '4. "1984" - Дж. Оруэлл',
      '5. "Гарри Поттер" - Дж. Роулинг',
    ];

    const header = [
      'Студент: Иванов Иван',
      'Группа: ИС-202',
      `Вариант: ${N}`,
      `Дата: ${now}`,
      '',
      'Любимые книги:',
      ...books,
      '',
    ].join('\n');

    // 2. Записываем файл
    await fs.writeFile(filePath, header, 'utf-8');
    console.log(`Создан файл: student_${N}.txt`);

    // 3. Читаем, считаем строки (непустые)
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').filter(l => l.trim() !== '').length;

    // 4. Дописываем строку с количеством записей
    await fs.appendFile(filePath, `Количество записей: ${lineCount}\n`, 'utf-8');

    // 5. Читаем финально и выводим
    const finalContent = await fs.readFile(filePath, 'utf-8');
    console.log('Содержимое файла:\n');
    console.log(finalContent);
  } catch (err) {
    console.error('Ошибка в задании 1:', err.message);
  }
}

main();