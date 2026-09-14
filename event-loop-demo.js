// Задание 4: Демонстрация порядка выполнения асинхронных операций

setTimeout(() => {
    console.log('1. setTimeout');
}, 0);

setImmediate(() => {
    console.log('2. setImmediate');
});

process.nextTick(() => {
    console.log('3. process.nextTick');
});

Promise.resolve().then(() => {
    console.log('4. Promise.then');
});

console.log('5. Синхронный код');

/*
=== ОБЪЯСНЕНИЕ ПОРЯДКА ВЫВОДА ===

Порядок вывода:
5. Синхронный код
3. process.nextTick
4. Promise.then
1. setTimeout
2. setImmediate


*/