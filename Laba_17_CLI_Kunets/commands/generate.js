// Задание 2: команда generate (отчёт)
const VALID_TYPES = ['html', 'pdf', 'json', 'csv'];

module.exports = function generate(options) {
  const type = options.type || 'html';
  const output = options.output || `./output.${type}`;

  if (!VALID_TYPES.includes(type)) {
    console.error(`Ошибка: недопустимый тип отчёта "${type}".`);
    console.error(`Допустимые значения: ${VALID_TYPES.join(', ')}`);
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${type}`);
    console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
    console.log(`[DRY-RUN] Действия не выполнены (режим проверки)`);
    return;
  }

  if (options.verbose) {
    console.log('[VERBOSE] Запуск генерации отчёта...');
    console.log(`[VERBOSE] Тип отчёта: ${type}`);
    console.log(`[VERBOSE] Путь сохранения: ${output}`);
  }
  console.log(`Отчёт успешно сгенерирован: ${output}`);
};
