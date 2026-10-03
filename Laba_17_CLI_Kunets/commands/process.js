const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const fs = require('fs');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = async function processFiles(files, options) {
  if (!files || files.length === 0) {
    console.error(chalk.red('Ошибка: не указаны файлы'));
    console.error(chalk.yellow('Использование: my-cli process --files a.txt b.txt'));
    process.exit(1);
  }

  const spinner = ora('Проверка файлов...').start();
  await sleep(600);

  const found = [];
  const missing = [];

  for (const f of files) {
    if (fs.existsSync(f)) {
      found.push(f);
    } else {
      missing.push(f);
    }
  }

  spinner.stop();

  const bar = new cliProgress.SingleBar({
    format: '[{bar}] {percentage}% | {value}/{total} | ETA: {eta}s',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
  });

  if (found.length > 0) {
    bar.start(found.length, 0);
    for (let i = 0; i < found.length; i++) {
      await sleep(200);
      bar.update(i + 1);
      process.stderr.write(chalk.green(`\u2714 Файл ${found[i]} обработан\n`));
    }
    bar.stop();
  }

  if (missing.length > 0) {
    for (const f of missing) {
      process.stderr.write(chalk.red(`\u2716 Файл ${f} не найден\n`));
    }
    process.stderr.write(chalk.yellow(`\u26A0 Пропущено ${missing.length} файл(ов)\n`));
  }

  const result = {
    processed: found,
    missing: missing,
    total: files.length,
  };

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
    process.stderr.write(chalk.green(`Результат сохранён: ${options.output}\n`));
  } else {
    console.log(JSON.stringify(result));
  }

  if (missing.length > 0) {
    process.exit(1);
  }
};
