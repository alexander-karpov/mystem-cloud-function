const { spawn } = require('child_process');

module.exports.handler = function handler(event) {
    const text = event.queryStringParameters.text;

    if (!text) {
        return {
            statusCode: 400,
            body: 'Query parameter "text" was not provided.'
        }
    }

    let mystem;

    try {
        mystem = spawn('./mystem', ['--format=json', '--weight', '-i']);
    } catch (error) {
        return {
            statusCode: 500,
            body: error.toString()
        }
    }

    const promise = new Promise((resolve, reject) => {
        let output;

        mystem.stdout.on('data', data => {
            output = data;
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
                body: output.toString()
            });
        });
    });

    const cyrillic = removeNonCyrillic(text);

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
