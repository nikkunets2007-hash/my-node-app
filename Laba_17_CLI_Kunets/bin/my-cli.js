#!/usr/bin/env node
// Лабораторная работа №17
// Задание 1: базовое CLI с позиционными аргументами
// Задание 2: расширение через commander
// Задание 3: интерактивный режим с inquirer
// Задание 4: форматированный вывод (chalk, ora, cli-progress)
// Студент: Кунец Никита, группа 401

const { Command } = require('commander');
const greet = require('../commands/greet');
const info = require('../commands/info');
const generate = require('../commands/generate');
const convert = require('../commands/convert');
const init = require('../commands/init');
const processFiles = require('../commands/process');

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17 (группа 401, Кунец Никита)')
  .version('1.0.0', '-V, --version', 'output the version number');

program.option('-v, --verbose', 'подробный вывод');

// ===== Задание 1: greet =====
program
  .command('greet <name>')
  .description('поприветствовать пользователя')
  .action((name) => greet(name));

// ===== Задание 1: info =====
program
  .command('info')
  .description('вывести информацию о группе')
  .action(() => info());

// ===== Задание 2: generate =====
program
  .command('generate')
  .description('сгенерировать отчёт')
  .option('-t, --type <type>', 'тип отчёта', 'html')
  .option('-o, --output <path>', 'путь для сохранения')
  .option('-f, --force', 'перезаписать существующий файл')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((options) => {
    const globalOpts = program.opts();
    generate({ ...options, verbose: options.verbose || globalOpts.verbose });
  });

// ===== Задание 2: convert =====
program
  .command('convert <input>')
  .description('конвертировать файл')
  .option('-f, --format <format>', 'целевой формат', 'json')
  .option('-o, --output <path>', 'путь для сохранения')
  .option('--dry-run', 'показать что будет сделано без выполнения')
  .action((input, options) => {
    const globalOpts = program.opts();
    convert(input, { ...options, verbose: options.verbose || globalOpts.verbose });
  });

// ===== Задание 3: init =====
program
  .command('init')
  .description('инициализировать проект (интерактивно)')
  .option('-n, --name <name>', 'название проекта')
  .option('-t, --type <type>', 'тип проекта (web, cli, lib, micro)')
  .option('--typescript', 'использовать TypeScript')
  .option('--eslint', 'использовать ESLint')
  .option('--prettier', 'использовать Prettier')
  .option('--jest', 'использовать Jest')
  .option('--git', 'инициализировать Git')
  .option('--no-interactive', 'отключить интерактивный режим')
  .action(async (options) => {
    await init(options);
  });

// ===== Задание 4: process =====
program
  .command('process')
  .description('обработать файлы (chalk, ora, cli-progress)')
  .option('--files <files...>', 'список файлов для обработки')
  .option('-o, --output <path>', 'сохранить результат в файл')
  .action(async (options) => {
    await processFiles(options.files, options);
  });

// ===== Обработка неизвестных команд =====
program.on('command:*', (operands) => {
  console.error(`Ошибка: неизвестная команда "${operands[0]}"`);
  console.error('Для справки используйте: my-cli --help');
  process.exit(1);
});

program.parse(process.argv);

// Если не передана ни одна команда — выводим справку
if (!process.argv.slice(2).length) {
  program.outputHelp();
}