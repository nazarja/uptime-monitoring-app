const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const lib = {};
lib.baseDir = path.join(__dirname, '/../.logs');

lib.append = (file, str, cb) => {
    fs.open(`${lib.baseDir}/${file}.log`, 'a', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, `${str}\n`, err => {
                if (!err) fs.close(fileDescriptor, err => {
                    if (!err) cb(false);
                    else cb('Error closing file that was being appended');
                })
                else cb('Error appending to file');
            })
        }
        else cb('Could not open to file for apending.');
    })
};

lib.list = (includeCompressedLogs, cb) => {
    fs.readdir(lib.baseDir, (err, data) => {
        if (!err && data && data.length > 0) {
            const fileNames = data.map(file => {
                if (file.includes('.log')) return file.replace('.log', '');
                else return false;
            });

            cb(false, fileNames);
        }
        else cb(err, data);
    })
};

lib.compress = (logID, newLogID, cb) => {
    const sourceFile = `${logID}.log`;
    const destFile = `${newLogID}.gz.b64`;

    fs.readFile(`${lib.baseDir}/${sourceFile}`, 'utf8', (err, content) => {
        if (!err && content) {
            zlib.gzip(content, (err, buffer) => {
                if (!err && buffer) {
                    fs.open(`${lib.baseDir}/${destFile}`, 'wx', (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if (!err) fs.close(fileDescriptor, err => {
                                    if (!err) cb(false);
                                    else cb(err);
                                });
                                else cb(err);
                            })
                        }
                        else cb(err);
                    })
                }
                else cb(err);
            });
        }
        else cb(err);
    })
};

lib.decompress = (fileID, cb) => {
    const fileName = `${fileID}.gz.b64`;

    fs.readFile(`${lib.baseDir}/${fileName}`,  'utf8', (err, str) => {
        if  (!err && str) {
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err, outputBuffer) {
                    str = outputBuffer.toString();
                    cb(false, str)
                }
                else cb(err);
            })
        } 
        else cb(err);
    })
};

lib.truncate = (logID, cb) => {
    fs.truncate(`${lib.baseDir}/${logID}.log`, 0, err => {
        if (!err) cb(false);
        else cb(err);
    })
};

module.exports = lib;