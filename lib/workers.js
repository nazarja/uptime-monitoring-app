const fs = require('fs');
const path = require('path');
const url = require('url');
const http = require('http');
const https = require('https');
const _data = require('./data');
const helpers = require('./helpers');
const _logs = require('./logs');

const workers = {};

workers.checkValidator = check => {
    check = typeof (check) === 'object' && check !== null
        ? check : {};
    check.id = typeof (check.checkID) === 'string' && check.checkID.length === 20
        ? check.checkID : false;
    check.phone = typeof (check.phone) === 'string' && check.phone.length === 10
        ? check.phone : false;
    check.protocol = typeof (check.protocol) === 'string' && ['http', 'https'].indexOf(check.protocol) > -1
        ? check.protocol : false;
    check.url = typeof (check.url) === 'string' && check.url.trim().length > 0
        ? check.url.trim() : false;
    check.method = typeof (check.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(check.method.toLowerCase()) > -1
        ? check.method : false;
    check.successCodes = typeof (check.successCodes) === 'object' && check.successCodes instanceof Array && check.successCodes.length > 0
        ? check.successCodes : false
    check.timeoutSeconds = typeof (check.timeoutSeconds) === 'number' && check.timeoutSeconds % 1 === 0 && check.timeoutSeconds <= 5
        ? check.timeoutSeconds : false;

    check.state = typeof (check.state) === 'string' && ['up', 'down'].indexOf(check.state) > -1
        ? check.state : 'down';
    check.lastChecked = typeof (check.lastChecked) === 'number' && check.timeoutSeconds > 0
        ? check.lastChecked : false;

    if (
        check.id && check.phone && check.protocol &&
        check.url && check.method && check.successCodes && check.timeoutSeconds
    ) workers.performCheck(check);
    else console.log('Error: One of the checks is not formatted correctly, skipping.');
};

workers.performCheck = check => {
    let outcomeSent = false;
    const outcome = {
        error: false,
        responseCode: false,
    };

    const parsedURL = url.parse(`${check.protocol}://${check.url}`, true);
    const hostname = parsedURL.hostname;
    const path = parsedURL.path;

    const requestObject = {
        protocol: `${check.protocol}:`,
        hostname,
        method: check.method.toUpperCase(),
        path,
        timeout: check.timeoutSeconds * 1000,
    };

    const _module = check.protocol === 'http' ? http : https;
    const req = _module.request(requestObject, res => {
        outcome.responseCode = res.statusCode;

        if (!outcomeSent) {
            workers.processCheckOutcome(check, outcome);
            outcomeSent = true;
        };
    });

    // bind to error
    req.on('error', err => {
        outcome.error = { error: true, value: err };

        if (!outcomeSent) {
            workers.processCheckOutcome(check, outcome);
            outcomeSent = true;
        };
    });

    // bind to timeout
    req.on('timeout', err => {
        outcome.error = { error: true, value: 'timeout' };

        if (!outcomeSent) {
            workers.processCheckOutcome(check, outcome);
            outcomeSent = true;
        };
    });

    req.end();
};

workers.processCheckOutcome = (check, outcome) => {
    const state = !outcome.error && outcome.responseCode && check.successCodes.indexOf(outcome.responseCode) > -1
        ? 'up' : 'down';

    const alert = check.lastChecked && check.state !== state
        ? true : false;

    const checkTime = Date.now()
    workers.log(check, outcome, state, alert, checkTime)

    const newCheck = check;
    newCheck.state = state;
    newCheck.lastChecked = checkTime;


    _data.update('checks', newCheck.id, newCheck, err => {
        if (!err) {
            if (alert) workers.alertUser(newCheck);
            else console.log('Check State has not changed, no need to alert user.');
        }
        else console.log('Error trying to saver updates to one of the checks');
    });
};

workers.alertUser = check => {
    const msg = `Alert: Your check for ${check.method.toUpperCase()} : ${check.protocol}://${check.url} is ${check.state.toUpperCase()}`;

    helpers.sendTwilioSms(check.phone, msg, err => {
        if (!err) console.log('Success, user was alerted via sms to their check.', msg);
        else console.log('Error: Could not send sms to user.', err)
    });
};

workers.gatherAllChecks = () => {
    _data.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, (err, check) => {
                    if (!err && check) {
                        workers.checkValidator(check);
                    }
                    else console.log('Error reading one of the checks data.')
                });
            });
        }
        else console.log('Error: Could not find any checks to process');
    })
};

workers.log = (check, outcome, state, alert, time) => {
    const log = { check, outcome, state, alert, time };
    const logString = JSON.stringify(log);

    const fileName = check.id;
    _logs.append(fileName, logString, err => {
        if  (!err) console.log('Success logging to file.');
        else console.log('Error logging to file.');
    })
}

workers.rotateLogs = () => {
    _logs.list(false, (err, logs) => {
        if (!err && logs) {
            logs.forEach(log => {
                const logID = log.replace('.log', '');
                const newLogID = `${logID}-${Date.now()}`;
                _logs.compress(logID, newLogID, err => {
                    if (!err) {
                        _logs.truncate(logID, err => {
                            if (!err) console.log('Success truncation log file.')
                            else console.log('Error truncation log file.')
                        })
                    }
                    else console.log('Error compressing one of the log files: ', err)
                })
            });
        }
        else console.log('Error: Could not find any logs to rotate.')
    });
};

workers.logRotatationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    }, (1000 * 60 * 60 * 24))
};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, (1000 * 60))
};

workers.init = () => {
    workers.gatherAllChecks();
    workers.loop();
    workers.rotateLogs();
    workers.logRotatationLoop();
};

module.exports = workers;