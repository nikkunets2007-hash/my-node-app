const fs = require('fs');
const path = require('path');
const util = require('util');

const writeFileP = util.promisify(fs.writeFile);
const unlinkP = util.promisify(fs.unlink);

const DIR = './perf-test-data';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

const N = 100; // количество файлов для теста

// ============ 1. СИНХРОННЫЙ ПОДХОД ============
function testSync() {
    console.log('\n=== СИНХРОННЫЙ ПОДХОД ===');
    const start = Date.now();
    for (let i = 0; i < N; i++) {
        const filePath = path.join(DIR, `sync-${i}.txt`);
        fs.writeFileSync(filePath, `Содержимое ${i}`);
    }
    for (let i = 0; i < N; i++) {
        fs.unlinkSync(path.join(DIR, `sync-${i}.txt`));
    }
    const duration = Date.now() - start;
    console.log(` ✅ Завершено за ${duration} мс`);
    return duration;
}

// ============ 2. АСИНХРОННЫЙ ПОДХОД (КОЛБЭКИ) ============
function testCallbacks() {
    return new Promise((resolve) => {
        console.log('\n=== АСИНХРОННЫЙ ПОДХОД (КОЛБЭКИ) ===');
        const start = Date.now();
        let completed = 0;

        const done = () => {
            completed++;
            if (completed === N * 2) {
                const duration = Date.now() - start;
                console.log(` ✅ Завершено за ${duration} мс`);
                resolve(duration);
            }
        };

        for (let i = 0; i < N; i++) {
            const filePath = path.join(DIR, `cb-${i}.txt`);
            fs.writeFile(filePath, `Содержимое ${i}`, (err) => {
                if (err) throw err;
                fs.unlink(filePath, (err) => {
                    if (err) throw err;
                    done();
                });
            });
        }
    });
}

// ============ 3. ПРОМИСЫ (async/await) ============
async function testPromises() {
    console.log('\n=== ПРОМИСЫ (async/await) ===');
    const start = Date.now();

    const writePromises = [];
    for (let i = 0; i < N; i++) {
        const filePath = path.join(DIR, `promise-${i}.txt`);
        writePromises.push(writeFileP(filePath, `Содержимое ${i}`));
    }
    await Promise.all(writePromises);

    const deletePromises = [];
    for (let i = 0; i < N; i++) {
        deletePromises.push(unlinkP(path.join(DIR, `promise-${i}.txt`)));
    }
    await Promise.all(deletePromises);

    const duration = Date.now() - start;
    console.log(` ✅ Завершено за ${duration} мс`);
    return duration;
}

// ============ ЗАПУСК ВСЕХ ТЕСТОВ ============
(async () => {
    console.log(`ТЕСТ ПРОИЗВОДИТЕЛЬНОСТИ: ${N} файлов на каждый подход`);

    const syncTime = testSync();
    const cbTime = await testCallbacks();
    const promiseTime = await testPromises();

    console.log('\n========== РЕЗУЛЬТАТЫ ==========');
    console.log(`Синхронный:  ${syncTime} мс`);
    console.log(`Колбэки:     ${cbTime} мс`);
    console.log(`Промисы:     ${promiseTime} мс`);

    // Очистка директории
    const remaining = fs.readdirSync(DIR);
    remaining.forEach(f => fs.unlinkSync(path.join(DIR, f)));
    fs.rmdirSync(DIR);

    console.log('\n✨ Самый быстрый подход выделен по времени выше.');
})();