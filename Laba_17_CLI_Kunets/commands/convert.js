// Задание 2: команда convert (конвертация)
module.exports = function convert(input, options) {
  if (!input) {
    console.error('Ошибка: не указан входной файл');
    process.exit(1);
  }

  const format = options.format || 'json';
  const output = options.output || `./converted.${format}`;

  if (options.verbose) {
    console.log('[VERBOSE] Запуск конвертации...');
    console.log(`[VERBOSE] Входной файл: ${input}`);
    console.log(`[VERBOSE] Формат: ${format}`);
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Будет конвертирован файл: ${input}`);
    console.log(`[DRY-RUN] Формат: ${format} > ${output}`);
    return;
  }

  console.log(`Файл ${input} успешно конвертирован в ${output}`);
};
