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

helpers.checker =  (payload, length) => {
    return typeof (payload) === 'string' && payload.trim().length >= length
        ? payload.trim()
        : false;
};

helpers.tokenCheck = token => {
    return typeof (token) === 'string' ? token : false;
};

helpers.createRandomString = num => {
    num = typeof (num) === 'number' && num ? num : false;

    if (num) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let str = '';

        for (let i = 0; i < num; i++) {
            const random = chars.charAt(Math.floor(Math.random() * chars.length))
            str += random;
        }

        return str;
    }
    else return false;
}

module.exports = helpers;