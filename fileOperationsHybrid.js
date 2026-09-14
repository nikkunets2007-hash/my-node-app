const fs = require('fs');
const path = require('path');
const util = require('util');

// Промис-версии
const writeFileP = util.promisify(fs.writeFile);
const readFileP = util.promisify(fs.readFile);
const unlinkP = util.promisify(fs.unlink);
const readdirP = util.promisify(fs.readdir);
const statP = util.promisify(fs.stat);

class FileManagerHybrid {
    constructor(baseDir = './data-hybrid') {
        this.baseDir = baseDir;
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
            console.log(`Создана директория: ${baseDir}`);
        }
    }

    /**
     * Универсальный метод: если передан callback — использует его,
     * иначе возвращает промис.
     */
    _execute(promise, callback) {
        if (typeof callback === 'function') {
            promise
                .then(result => callback(null, result))
                .catch(err => callback(err, null));
            return undefined;
        }
        return promise;
    }

    createFile(filename, content, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = writeFileP(filePath, content, 'utf8').then(() => filePath);
        return this._execute(promise, callback);
    }

    readFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = readFileP(filePath, 'utf8');
        return this._execute(promise, callback);
    }

    getFileStats(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = statP(filePath).then(stats => ({
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile()
        }));
        return this._execute(promise, callback);
    }

    deleteFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);
        const promise = unlinkP(filePath);
        return this._execute(promise, callback);
    }

    async listFiles(callback) {
        const promise = (async () => {
            const files = await readdirP(this.baseDir);
            const stats = await Promise.all(
                files.map(async (file) => {
                    const s = await statP(path.join(this.baseDir, file));
                    return { name: file, isFile: s.isFile() };
                })
            );
            return stats.filter(f => f.isFile).map(f => f.name);
        })();
        return this._execute(promise, callback);
    }
}

module.exports = FileManagerHybrid;