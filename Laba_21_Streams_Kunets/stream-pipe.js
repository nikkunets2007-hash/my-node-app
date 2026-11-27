// Лабораторная работа №21, Задание 3
// pipe() и pipeline()
// Студент: Кунец Никита, группа 401

const fs = require('fs');
const path = require('path');
const { pipeline, Transform } = require('stream');

const inputPath = path.join(__dirname, 'input.txt');
if (!fs.existsSync(inputPath)) {
  fs.writeFileSync(inputPath, 'Hello, streams!\nLine 2\nLine 3\n');
}

console.log('=== Демонстрация pipe() ===');
console.log('Чтение: input.txt');
console.log('Запись: output-pipe.txt');

const rs1 = fs.createReadStream(inputPath);
const ws1 = fs.createWriteStream(path.join(__dirname, 'output-pipe.txt'));

rs1.pipe(ws1);

ws1.on('finish', () => {
  const size = fs.statSync(path.join(__dirname, 'output-pipe.txt')).size;
  console.log('✔ Копирование завершено');
  console.log(`Размер: ${size} байт`);

  console.log('');
  console.log('=== Демонстрация pipe() с ошибкой ===');
  console.log('Чтение: missing.txt');

  const rs2 = fs.createReadStream(path.join(__dirname, 'missing.txt'));
  const ws2 = fs.createWriteStream(path.join(__dirname, 'output-pipe-err.txt'));

  rs2.on('error', (err) => {
    console.log(`✖ Ошибка: ${err.code}: no such file or directory`);
    console.log('⚠ Внимание: pipe() не закрыл целевой поток!');
    console.log('⚠ Возможна утечка памяти.');

    console.log('');
    console.log('=== Демонстрация pipeline() ===');
    console.log('Чтение: input.txt');
    console.log('Запись: output-pipeline.txt');

    pipeline(
      fs.createReadStream(inputPath),
      fs.createWriteStream(path.join(__dirname, 'output-pipeline.txt')),
      (err) => {
        if (err) {
          console.error('✖ Ошибка pipeline:', err.message);
        } else {
          console.log('✔ Копирование завершено');

          console.log('');
          console.log('=== Демонстрация pipeline() с ошибкой ===');
          console.log('Чтение: missing.txt');

          pipeline(
            fs.createReadStream(path.join(__dirname, 'missing.txt')),
            fs.createWriteStream(path.join(__dirname, 'output-pipeline-err.txt')),
            (err2) => {
              if (err2) {
                console.log(`✖ Ошибка: ${err2.code}: no such file or directory`);
                console.log('✔ Все потоки автоматически закрыты');
                console.log('✔ Утечек нет');

                console.log('');
                console.log('=== Цепочка потоков ===');
                console.log('input.txt → uppercase → reverse → output-chain.txt');

                const upper = new Transform({
                  transform(chunk, enc, cb) {
                    cb(null, chunk.toString().toUpperCase());
                  },
                });
                const reverse = new Transform({
                  transform(chunk, enc, cb) {
                    cb(null, chunk.toString().split('').reverse().join(''));
                  },
                });

                pipeline(
                  fs.createReadStream(inputPath),
                  upper,
                  reverse,
                  fs.createWriteStream(path.join(__dirname, 'output-chain.txt')),
                  (err3) => {
                    if (err3) console.error(err3.message);
                    else console.log('✔ Обработка завершена');
                  }
                );
              }
            }
          );
        }
      }
    );
  });

  rs2.pipe(ws2);
});
