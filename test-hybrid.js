const FileManagerHybrid = require('./fileOperationsHybrid');

const fileManager = new FileManagerHybrid('./test-data-hybrid');
console.log('=== ТЕСТИРОВАНИЕ ГИБРИДНОГО ПОДХОДА ===\n');

(async () => {
    // Стиль 1: Промисы (async/await)
    console.log('--- Стиль 1: Промисы ---');
    const filePath = await fileManager.createFile('hybrid1.txt', 'Файл через промис');
    console.log(` ✅ Создан: ${filePath}`);
    const content = await fileManager.readFile('hybrid1.txt');
    console.log(` ✅ Прочитано: "${content}"`);

    // Стиль 2: Колбэки
    console.log('\n--- Стиль 2: Колбэки ---');
    fileManager.createFile('hybrid2.txt', 'Файл через колбэк', (err, path) => {
        if (err) {
            console.error(' ❌ Ошибка:', err.message);
            return;
        }
        console.log(` ✅ Создан: ${path}`);

        fileManager.readFile('hybrid2.txt', (err, data) => {
            if (err) {
                console.error(' ❌ Ошибка:', err.message);
                return;
            }
            console.log(` ✅ Прочитано: "${data}"`);

            // Список файлов (тоже через колбэк)
            fileManager.listFiles((err, files) => {
                if (err) {
                    console.error(' ❌ Ошибка:', err.message);
                    return;
                }
                console.log(` ✅ Файлов в директории: ${files.length}`);
                files.forEach(f => console.log(`   - ${f}`));

                // Очистка через промис
                (async () => {
                    for (const f of files) {
                        await fileManager.deleteFile(f);
                        console.log(` ✅ Удалён: ${f}`);
                    }
                    console.log('\n✅ Все операции завершены!');
                })();
            });
        });
    });
})();