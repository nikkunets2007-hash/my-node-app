// Лабораторная работа №21, Задание 4
// Transform-поток и Object Mode
// Студент: Кунец Никита, группа 401

const { Readable, Transform, Writable } = require('stream');

const GROUP = '401';

class UpperCaseTransform extends Transform {
  _transform(chunk, encoding, callback) {
    const out = `[${GROUP}] ${chunk.toString().toUpperCase()}`;
    callback(null, out + '\n');
  }
}

class JsonParserTransform extends Transform {
  constructor() {
    super({ objectMode: true });
    this.buffer = '';
  }

  _transform(chunk, encoding, callback) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();
    try {
      for (const line of lines) {
        if (!line.trim()) continue;
        this.push(JSON.parse(line));
      }
      callback();
    } catch (e) {
      callback(e);
    }
  }

  _flush(callback) {
    if (this.buffer.trim()) {
      try {
        this.push(JSON.parse(this.buffer));
      } catch (e) {
        return callback(e);
      }
    }
    callback();
  }
}

class FilterTransform extends Transform {
  constructor(predicate) {
    super({ objectMode: true });
    this.predicate = predicate;
  }

  _transform(obj, encoding, callback) {
    if (this.predicate(obj)) callback(null, obj);
    else callback();
  }
}

console.log('=== Демонстрация Transform-потока ===');
const up = new UpperCaseTransform();
up.on('data', (d) => process.stdout.write(d.toString()));
up.write('группа ' + GROUP + '\n');
up.write('студент кунец никита\n');
up.end();

setTimeout(() => {
  console.log('');
  console.log('=== Демонстрация Object Mode ===');

  const jsonLines = [
    { id: 1, name: 'Иван', group: GROUP },
    { id: 2, name: 'Мария', group: '402' },
    { id: 3, name: 'Петр', group: GROUP },
  ]
    .map((o) => JSON.stringify(o))
    .join('\n') + '\n';

  console.log('Входные данные (JSON):');
  console.log(jsonLines);

  const source = Readable.from([jsonLines]);
  const parser = new JsonParserTransform();
  const filter = new FilterTransform((o) => o.group === GROUP);

  console.log('После парсинга (все объекты):');
  parser.on('data', (obj) => console.log('[OBJECT]', obj));

  const ws = new Writable({
    objectMode: true,
    write(obj, enc, cb) {
      console.log('[FILTERED]', obj);
      cb();
    },
  });

  source.pipe(parser).pipe(filter).pipe(ws);

  ws.on('finish', () => {
    setTimeout(async () => {
      console.log('');
      console.log('=== Демонстрация async iterator ===');

      const r = Readable.from(['Данные 1', 'Данные 2', 'Данные 3']);
      let i = 1;
      for await (const chunk of r) {
        console.log(`[ASYNC] Получен чанк ${i++}: "${chunk}"`);
      }
      console.log('[ASYNC] Поток завершён');

      console.log('');
      console.log('=== Цепочка Transform ===');
      console.log('Читаем → UpperCase → Filter → Записываем');

      const lines = ['строка 1', 'строка 2', 'строка 3', GROUP, 'тест', 'фильтр', 'ещё', 'данные', 'поток', 'конец'];
      const rs = Readable.from(lines);
      
      // Простой Transform без префикса (только uppercase), чтобы фильтр корректно работал
      const up2 = new Transform({
        transform(chunk, enc, cb) {
          cb(null, chunk.toString().toUpperCase());
        },
      });
      
      let passed = 0;

      const filter2 = new Transform({
        transform(chunk, enc, cb) {
          const s = chunk.toString();
          // Пропускаем строки, содержащие '1', '2' или '401'
          if (s.includes('1') || s.includes('2') || s.includes(GROUP)) {
            passed++;
            cb(null, s);
          } else {
            cb();
          }
        },
      });

      const ws2 = new Writable({
        write(chunk, enc, cb) {
          cb();
        },
      });

      rs.pipe(up2).pipe(filter2).pipe(ws2);
      ws2.on('finish', () => {
        console.log(`✔ Обработано ${lines.length} строк, отфильтровано ${lines.length - passed}`);
      });
    }, 100);
  });
}, 200);
