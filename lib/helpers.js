const config = require('./config');
const crypto = require('crypto');

const helpers = {};

helpers.hash = str => {
    if (typeof (str) === 'string' && str.length) {
        return crypto
            .createHmac('sha256', config.hashSecret)
            .update(str)
            .digest('hex');
    }
    else return false;
}

helpers.parseJsonToObject = str => {
    try { return JSON.parse(str); }
    catch (err) { return {}; }
}

module.exports = helpers;