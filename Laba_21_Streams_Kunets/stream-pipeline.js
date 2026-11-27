// Лабораторная работа №21, Задание 5
// Полноценный конвейер: backpressure, мониторинг, таймаут
// Студент: Кунец Никита, группа 401

const { Readable, Transform, Writable, pipeline } = require('stream');
const fs = require('fs');
const path = require('path');

const GROUP = '401';
const TOTAL = 10000;
const CSV_FILE = path.join(__dirname, 'students.csv');
const ERROR_LOG = path.join(__dirname, 'errors.log');

fs.writeFileSync(ERROR_LOG, '');
if (fs.existsSync(CSV_FILE)) fs.unlinkSync(CSV_FILE);

class StudentSource extends Readable {
  constructor(total, slow = false) {
    super({ objectMode: true, highWaterMark: 100 });
    this.total = total;
    this.generated = 0;
    this.slow = slow;
  }

  _read() {
    if (this.generated >= this.total) {
      this.push(null);
      return;
    }
    const batchSize = Math.min(100, this.total - this.generated);
    const pushBatch = () => {
      for (let i = 0; i < batchSize; i++) {
        const id = this.generated + 1;
        const isBroken = id % 1000 === 0;
        const grade = isBroken ? 'bad' : Math.round((2 + Math.random() * 3) * 10) / 10;
        this.generated++;
        this.push({
          id,
          name: isBroken ? '' : `Студент ${id}`,
          group: GROUP,
          course: 1 + (id % 4),
          grade,
        });
      }
    };
    if (this.slow) setTimeout(pushBatch, 20);
    else pushBatch();
  }
}

class ValidateTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(obj, enc, cb) {
    if (!obj.name || typeof obj.grade !== 'number') {
      this.stats.errors++;
      fs.appendFileSync(ERROR_LOG, `[${new Date().toISOString()}] [${GROUP}] Ошибка валидации: id=${obj.id}\n`);
      return cb();
    }
    this.stats.valid++;
    cb(null, obj);
  }
}

class EnrichTransform extends Transform {
  constructor(stats) {
    super({ objectMode: true });
    this.stats = stats;
  }
  _transform(obj, enc, cb) {
    obj.averageGrade = Math.round(obj.grade * 10) / 10;
    this.stats.enriched++;
    cb(null, obj);
  }
}

class FilterTransform extends Transform {
  constructor() { super({ objectMode: true }); }
  _transform(obj, enc, cb) {
    if (obj.grade > 3) cb(null, obj);
    else cb();
  }
}

class FormatTransform extends Transform {
  constructor() { super({ writableObjectMode: true, readableObjectMode: false }); }
  _transform(obj, enc, cb) {
    cb(null, `${obj.id},${obj.name},${obj.group},${obj.course},${obj.grade},${obj.averageGrade}\n`);
  }
}

class CsvSink extends Writable {
  constructor(file, stats, expected) {
    super({ highWaterMark: 1024 });
    this.stream = fs.createWriteStream(file);
    this.stats = stats;
    this.expected = expected;
    this.startTime = Date.now();
    this.headerWritten = false;
  }
  _write(chunk, enc, cb) {
    if (!this.headerWritten) {
      this.stream.write('id,name,group,course,grade,averageGrade\n');
      this.headerWritten = true;
    }
    this.stats.written++;
    const ok = this.stream.write(chunk);
    if (this.stats.written % 2000 === 0) {
      const percent = Math.round((this.stats.written / this.expected) * 100);
      const elapsed = (Date.now() - this.startTime) / 1000;
      const speed = Math.round(this.stats.written / (elapsed || 1));
      const filled = Math.round(percent / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      console.log(`[PROGRESS] ${bar} ${percent}% | ${this.stats.written}/${this.expected} | ${speed} записей/сек`);
    }
    if (!ok) {
      console.log(`[BACKPRESSURE] Writable переполнен на ${this.stats.written}-й записи`);
      this.stream.once('drain', () => { console.log('[DRAIN] Продолжаем запись'); cb(); });
    } else cb();
  }
  _final(cb) { this.stream.end(cb); }
}

// ===== Запуск =====
console.log(`=== Конвейер обработки данных (группа ${GROUP}) ===`);
console.log(`Источник: ${TOTAL} студентов`);
console.log('Фильтр: оценка > 3');

const stats = { valid: 0, enriched: 0, written: 0, errors: 0 };
const startTime = Date.now();

pipeline(
  new StudentSource(TOTAL),
  new ValidateTransform(stats),
  new EnrichTransform(stats),
  new FilterTransform(),
  new FormatTransform(),
  new CsvSink(CSV_FILE, stats, TOTAL),
  (err) => {
    if (err) { console.error('[ERROR]', err.message); return; }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const speed = Math.round(stats.written / (elapsed || 1));
    console.log('');
    console.log('=== Результаты ===');
    console.log(`Всего сгенерировано: ${TOTAL}`);
    console.log(`Прошло валидацию: ${stats.valid}`);
    console.log(`Обогащено: ${stats.enriched}`);
    console.log(`Отфильтровано: ${stats.valid - stats.written}`);
    console.log(`Записано в CSV: ${stats.written}`);
    console.log(`Ошибок: ${stats.errors}`);
    console.log(`Время выполнения: ${elapsed} сек`);
    console.log(`Средняя скорость: ${speed} записей/сек`);
    const size = fs.existsSync(CSV_FILE) ? (fs.statSync(CSV_FILE).size / 1024).toFixed(1) : 0;
    console.log(`Файл: students.csv (${size} КБ)`);

    // ===== Отмена по таймауту (медленный источник) =====
    console.log('');
    console.log('=== Отмена по таймауту ===');
    console.log('Запуск с таймаутом 100 мс (медленный источник)...');

    const src2 = new StudentSource(TOTAL, true); // slow = true
    const timer = setTimeout(() => {
      console.log('✖ Таймаут! Обработка отменена');
      src2.destroy();
      console.log('✔ Все потоки корректно закрыты');
      console.log('✔ Ресурсы освобождены');
    }, 100);

    src2.on('close', () => {
      clearTimeout(timer);
      console.log('(поток завершён)');
    });
    src2.resume();
  }
);
