const { config } = require('process');
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

/*=============================
  USERS
=============================*/

handlers.users = (data, cb) => {
    const acceptMethods = ['get', 'post', 'put', 'delete'];
    if (acceptMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, cb);
    }
    else cb(405)
};

handlers._users = {

    // GET
    get: (data, cb) => {
        if (data.query.phone) {
            const phone = helpers.checker(data.payload.phone, 10);
            if (phone) {
                const token = helpers.tokenCheck(data.headers.token);
                handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                    if (tokenIsValid) {
                        _data.read('users', phone, (err, data) => {
                            if (!err && data) {
                                // remove password hash
                                delete data.hash;
                                cb(200, data);
                            }
                            else cb(404);
                        })
                    }
                    else cb(403, { 'Error': 'Missing required token in header or token is invalid. ' })
                });
            }
            else cb(400, { 'Error': 'Missing required field' })
        }
        else cb(400, { 'Error': 'Missing required field' })
    },

    // POST
    post: (data, cb) => {
        const firstName = helpers.checker(data.payload.firstName, 1);
        const lastName = helpers.checker(data.payload.lastName, 1);
        const phone = helpers.checker(data.payload.phone, 10);
        const password = helpers.checker(data.payload.password, 1);
        const tosAgreement = typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement;

        firstName && lastName && phone && password && tosAgreement
            ? (
                _data.read('users', phone, (err, data) => {
                    // err means user does not exist
                    if (err) {
                        const hash = helpers.hash(password);
                        if (hash) {
                            const userObj = {
                                firstName, lastName, phone, hash, tosAgreement: true
                            };

                            _data.create('users', phone, userObj, err => {
                                if (!err) cb(200);
                                else {
                                    console.log(err);
                                    cb(500, { 'Error': 'Could not create the new user' })
                                }
                            });
                        }
                        else cb(500, { 'Error': 'Could not hash the user\s password' })
                    }
                    else cb(400, { 'Error': 'A user with that phone number already exists' });
                })
            )
            : cb(400, { 'Error': 'Missing required fields' });
    },

    // PUT
    put: (data, cb) => {
        if (data.payload.phone) {
            const firstName = helpers.checker(data.payload.firstName, 1);
            const lastName = helpers.checker(data.payload.lastName, 1);
            const phone = helpers.checker(data.payload.phone, 10);
            const password = helpers.checker(data.payload.password, 1);

            if (phone) {
                if (firstName || lastName || password) {
                    const token = helpers.tokenCheck(data.headers.token);
                    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                        if (tokenIsValid) {
                            _data.read('users', phone, (err, userData) => {
                                if (!err && userData) {
                                    if (firstName) userData.firstName = firstName;
                                    if (lastName) userData.lastName = lastName;
                                    if (password) userData.hash = helpers.hash(password);

                                    _data.update('users', phone, userData, err => {
                                        if (!err) cb(200)
                                        else cb(500, { 'Error': 'Could not update the user' });
                                    })
                                }
                                else cb(400, { 'Error': 'The specified user does not exist' });
                            })
                        }
                        else cb(403, { 'Error': 'Missing required token in header or token is invalid. ' })
                    });
                }
                else cb(400, { 'Error': 'Missing required fields to update' })
            }
            else cb(400, { 'Error': 'Missing required field' });
        }
        else cb(400, { 'Error': 'Missing required field' });
    },

    // DELETE
    delete: (data, cb) => {
        if (data.query.phone) {
            const phone = helpers.checker(data.query.phone, 10);

            const token = helpers.tokenCheck(data.headers.token);
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if (tokenIsValid) {
                    _data.read('users', phone, (err, userData) => {
                        if (!err && data) {
                            _data.delete('users', phone, err => {
                                if (!err) {
                                    const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : false;
                                    const checksToDelete = userChecks.length;

                                    if  (checksToDelete > 0) {
                                        let checksDeleted = 0;
                                        let deletionErrors = false;

                                        userChecks.forEach(checkID => {
                                            _data.delete('checks', checkID, err => {
                                                if (err) deletionErrors = true;
                                                checksDeleted++;

                                                if (checksDeleted === checksToDelete) {
                                                    if (!deletionErrors) cb(200);
                                                    else cb(500, {'Error': 'Errors encounters will deleting all the users checks successfully'});
                                                }
                                            })
                                        })
                                    }
                                    else cb(200);
                                }
                                else cb(500, { 'Error': 'Could not delete the specified user' });
                            })
                        }
                        else cb(400, { 'Error': 'Could not find the specified user' });
                    })
                }
                else cb(403, { 'Error': 'Missing required token in header or token is invalid. ' })
            });
        }
        else cb(400, { 'Error': 'Missing required field' })
    }
};

/*=============================
  TOKENS
=============================*/

handlers.tokens = (data, cb) => {
    const acceptMethods = ['get', 'post', 'put', 'delete'];
    if (acceptMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, cb);
    }
    else cb(405)
};

handlers._tokens = {

    // GET
    get: (data, cb) => {
        if (data.query.tokenID) {
            const tokenID = helpers.checker(data.query.tokenID, 20);

            if (tokenID) {
                _data.read('tokens', tokenID, (err, tokenData) => {
                    if (!err && tokenData) cb(200, tokenData);
                    else cb(404);
                })
            }
            else cb(400, { 'Error': 'Missing required token field' })
        }
        else cb(400, { 'Error': 'Missing required token field' })
    },

    // POST
    post: (data, cb) => {
        const phone = helpers.checker(data.payload.phone, 10);
        const password = helpers.checker(data.payload.password, 1);

        if (phone && password) {
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    const hash = helpers.hash(password);

                    if (hash === userData.hash) {
                        const tokenID = helpers.createRandomString(20);
                        const expiry = Date.now() + (1000 * 60 * 60);
                        const token = { phone, tokenID, expiry };

                        _data.create('tokens', tokenID, token, err => {
                            if (!err) cb(200, token)
                            else cb(500, { 'Error': 'Could not create a new token' });
                        });
                    }
                    else cb(400, { 'Errro': 'Password did not match the specified users password.' })
                }
                else cb(400, { 'Error': 'Could not find the specified user.' })
            })
        }
        else cb(400, { 'Error': 'Missing required fields' });
    },

    // PUT
    put: (data, cb) => {
        const tokenID = helpers.checker(data.payload.tokenID, 20);
        const extend = typeof (data.payload.extend) === 'boolean' && data.payload.extend;

        if (tokenID && extend) {
            _data.read('tokens', tokenID, (err, tokenData) => {
                if (!err && tokenData) {
                    if (tokenData.expiry > Date.now()) {
                        tokenData.expiry = Date.now() + (1000 * 60 * 60);
                        _data.update('tokens', tokenID, tokenData, err => {
                            if (!err) cb(200);
                            else cb(500, { 'Error': 'Could not update the tokens expiry' });
                        })
                    }
                    else cb(400, { 'Error': 'The token has already expired and cannot be extended.' })
                }
                else cb(400, { 'Error': 'Specified token does not exist' });
            });
        }
        else cb(400, { 'Error': 'Missing required fields or fields are invalid.' })

    },

    // DELETE
    delete: (data, cb) => {
        if (data.query.tokenID) {
            const tokenID = helpers.checker(data.query.tokenID, 20);

            _data.read('tokens', tokenID, (err, tokenData) => {
                if (!err && tokenData) {
                    _data.delete('tokens', tokenID, err => {
                        if (!err) cb(200)
                        else cb(500, { 'Error': 'Could not delete the specified token' });
                    })
                }
                else cb(400, { 'Error': 'Could not find the specified token' });
            })
        }
        else cb(400, { 'Error': 'Missing required field' })
    }
};

// verify tokenID id valid for user
handlers._tokens.verifyToken = (tokenID, phone, cb) => {
    _data.read('tokens', tokenID, (err, tokenData) => {
        if (!err && tokenData) {
            if (tokenData.phone === phone && tokenData.expiry > Date.now()) cb(true);
            else cb(false);
        }
        else cb(false);
    })
}

/*=============================
  CHECKS
=============================*/

handlers.checks = (data, cb) => {
    const acceptMethods = ['get', 'post', 'put', 'delete'];
    if (acceptMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data, cb);
    }
    else cb(405)
};

// required data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks = {

    get: (data, cb) => {
        const checkID = helpers.checker(data.query.checkID, 20);

        if (checkID) {

            _data.read('checks', checkID, (err, checkData) => {
                if (!err && checkData) {

                    const token = helpers.tokenCheck(data.headers.token);
                    handlers._tokens.verifyToken(token, checkData.phone, tokenIsValid => {
                        if (tokenIsValid) cb(200, checkData);
                        else cb(403);
                    });
                }
                else cb(404);
            })
        }
        else cb(400, { 'Error': 'Missing required field' })
    },

    post: (data, cb) => {
        const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
            ? data.payload.protocol
            : false

        const method = typeof (data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method.toLowerCase()) > - 1
            ? data.payload.method
            : false

        const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0
            ? data.payload.successCodes
            : false

        const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : false;

        const url = helpers.checker(data.payload.url, 0);

        if (protocol && url && method && successCodes && timeoutSeconds) {
            const token = helpers.tokenCheck(data.headers.token);
            _data.read('tokens', token, (err, tokenData) => {
                if (!err && tokenData) {
                    const phone = tokenData.phone;

                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            const userChecks = typeof (userData.checks) === 'object' && userData.checks  instanceof Array ? userData.checks : [];
                            const maxChecks = userChecks.length < config.maxChecks;

                            if (!maxChecks) {
                                const checkID = helpers.createRandomString(20);
                                const checkObject = {
                                    checkID, phone, protocol, url,
                                    method, successCodes, timeoutSeconds
                                }

                                _data.create('checks', checkID, checkObject, err => {
                                    if (!err) {
                                        userData.checks = userChecks;
                                        console.log(userData.checks)
                                        userData.checks.push(checkID);
                                        console.log(userData.checks)
                                        _data.update('users', phone, userData, err => {
                                            if (!err) cb(200, checkObject);
                                            else cb(500, { ' Error': 'Could not update the user with the new check' });
                                        })
                                    }
                                    else cb(500, { 'Error': 'Could not create the new check' })
                                })
                            }
                            else cb(400, { 'Error': `The user already has the maximum number of checks ${config.maxChecks}` })
                        }
                        else cb(403)
                    })
                }
                else cb(403);
            })
        }
        else cb(400, { 'Error': 'Missing required inputs or inputs are invalid' });
    },

    put: (data, cb) => {
        const checkID = helpers.checker(data.payload.checkID, 20);
        const protocol = typeof (data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1
            ? data.payload.protocol
            : false

        const url = typeof (data.payload.url) === 'string' && data.payload.url
            ? data.payload.url
            : false

        const method = typeof (data.payload.method) === 'string' && ['get', 'post', 'put', 'delete'].indexOf(data.payload.method.toLowerCase()) > - 1
            ? data.payload.method
            : false

        const successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0
            ? data.payload.successCodes
            : false

        const timeoutSeconds = typeof (data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : false;

        if (checkID) {
            if (protocol || url || method || successCodes || timeoutSeconds) {
                _data.read('checks', checkID, (err, checkData) => {
                    if (!err && checkData) {
                        const token = helpers.tokenCheck(data.headers.token);
                        handlers._tokens.verifyToken(token, checkData.phone, tokenIsValid => {
                            if (tokenIsValid) {

                                if (protocol) checkData.protocol = protocol;
                                if (url) checkData.url.toLowerCase() = url;
                                if (method) checkData.method = method;
                                if (successCodes) checkData.successCodes = successCodes;
                                if (timeoutSeconds) checkData.timeoutSeconds = timeoutSeconds;
                                console.log(protocol, url, method, successCodes, timeoutSeconds)

                                _data.update('checks', checkID, checkData, err => {
                                    if (!err) cb(200);
                                    else cb(500, { 'Error': 'Could not update the check' });
                                })
                            }
                            else cb(403)
                        });
                    }
                    else cb(400, { 'Error': 'The check id did not exist' });
                })
            }
            else cb(400, { 'Error': 'Missing required fields to update.' })
        }
        else cb(400, { 'Error': 'Missing required field' });
    },

    delete: (data, cb) => {
        const checkID = helpers.checker(data.query.checkID, 20);

        if (checkID) {
            _data.read('checks', checkID, (err, checkData) => {
                console.log(checkID, checkData)
                if (!err && checkData) {
                    const token = helpers.tokenCheck(data.headers.token);
                    handlers._tokens.verifyToken(token, checkData.phone, tokenIsValid => {
                        if (tokenIsValid) {
                            _data.delete('checks', checkID, err => {
                                if (!err) {
                                    _data.read('users', checkData.phone, (err, userData) => {
                                        if (!err && userData) {
                                            const userChecks = typeof (userData.checks) === 'object' instanceof Array ? userData.checks : [];
                                            const position = userData.checks.indexOf(checkID);
                                            if (position > -1) {
                                                userChecks.splice(position, 1);
                                                _data.update('users', checkData.phone, userData, err => {
                                                    if (!err) cb(200);
                                                    else cb(500, { 'Error': 'Could not update the user check data' })
                                                })
                                            }
                                            else cb(500, { 'Error': 'Could not find check on user object' })
                                        }
                                        else cb(500, { 'Error': 'Could not find user that created the check, and could not remove check from list of checks' })
                                    })
                                }
                                else cb(500, { 'Error': 'Could not delete the check data' });
                            })
                        }
                        else cb(403);
                    })
                }
                else cb(400, { 'Error': 'Could not find the specified check, it does not exist' });
            })
        }
        else cb(400, { 'Error': 'Missing required field' })
    }
}


/*=============================
  MISC.
=============================*/

handlers.ping = (data, cb) => cb(200);
handlers.notfound = (data, cb) => cb(404);

module.exports = handlers;