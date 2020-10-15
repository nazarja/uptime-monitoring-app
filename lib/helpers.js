const config = require('./config');
const crypto = require('crypto');
const queryString = require('querystring');
const https = require('https');

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

helpers.sendTwilioSms = (phone, msg, cb) => {
    phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone : false;
    msg = typeof(msg) === 'string' && msg.trim().length > 0 && msg.trim().length < 1600 ? msg.trim() : false;

    if (phone && msg) {
        const payload = {
            From: config.twilio.fromPhone,
            To: '+353'+ phone,
            Body: msg,
        };

        const stringPayload = queryString.stringify(payload);
        const requestDetails = {
            protocol: 'https:',
            hostname: 'api.twilio.com',
            method: 'POST',
            path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload),
            }
        };

        const req = https.request(requestDetails, res => {
            const status = res.statusCode;

            if  (status === 200 || status === 201) cb(false);
            else cb(`Error: Status code returned was: ${status}`)
        });

        req.on('error', err => cb("Request Error:" + err));
        req.write(stringPayload);
        req.end();
    }
    else cb('Given parameters were missing or invalid');
}

module.exports = helpers;