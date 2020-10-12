const fs = require('fs');
const path = require('path');

const lib = {};
lib.baseDir = path.join(__dirname, '/../.data');
lib.create = (dir, file, data, cb) => {
    // open new file
    fs.open(`${lib.baseDir}${dir}'/${file}.json`, 'wx', (err, fileDescriptor) => {
        // no error
        if  (!err + fileDescriptor) {
            // convert data to string
            const stringData = JSON.stringify(data);
            // write file
            fs.writeFile(fileDescriptor, stringData, err => {
                if (err) cb('Error writing to new file.')
                // close file
                else fs.close(fileDescriptor, err => {
                    if (err) cb('Error closing new file');
                    // all good, return false
                    else cb(false);
                });
            });
        }
        else cb('Could not create new file, it may already exist.');
    });
};

module.exports = lib;