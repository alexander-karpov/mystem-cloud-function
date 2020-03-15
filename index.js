const { spawn } = require('child_process');
const fs = require('fs');

module.exports.handler = function handler(event) {
    const text = event.queryStringParameters.text;

    if (!text) {
        return {
            statusCode: 400,
            body: 'Query parameter "text" was not provided.'
        }
    }

    const cyrillic = removeNonCyrillic(text.toLowerCase());
    const cacheFilename = '/tmp/mystem-' + encodeURIComponent(cyrillic);

    /**
     * Пробуем найти результат в кэше в /tmp
     */
    try {
        const data = fs.readFileSync(cacheFilename).toString('utf-8');

        console.log(`Результат для «${cyrillic}» взят из кэша.`)

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: data
        }
    } catch(error) {
        console.log(`Результат для «${cyrillic}» не найден в кэше.`)
        // Не нашли на диске. Обращаемся к mystem
    }

    let mystem;

    try {
        mystem = spawn('mystem', ['--format=json', '--weight', '-i']);
    } catch (error) {
        return {
            statusCode: 500,
            body: error.toString()
        }
    }

    const promise = new Promise((resolve, reject) => {
        let output = '';

        mystem.stdout.on('data', data => {
            output += data;
        });

        mystem.stderr.on('data', error => {
            reject({
                statusCode: 500,
                body: error.toString()
            });
        });

        mystem.stdout.on('close', () => {
            if (!output) {
                resolve({
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: '[]'
                });

                return;
            }

            resolve({
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: output
            });

            /**
             * Сохраняем результат в кэш в /tmp
             */
            fs.writeFileSync(cacheFilename, output);
        });
    });

    mystem.stdin.write(`${cyrillic}\n`);
    mystem.stdin.end();

    return promise;
}

/**
 * Оставляет в тексте только кирилические симводы и пробелы
 * Удаляет из текст то, что мы явно не можем обработать
 * @param message {String}
 * @returns {String}
 */
function removeNonCyrillic(message) {
    return message.replace(/[^а-яА-ЯёЁ ]+/g, '');
}
