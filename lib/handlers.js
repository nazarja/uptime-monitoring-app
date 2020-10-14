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
                const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
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
                    const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
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
            const phone = helpers.checker(data.payload.phone, 10);

            const token = typeof (data.headers.token) === 'string' ? data.headers.token : false;
            handlers._tokens.verifyToken(token, phone, tokenIsValid => {
                if (tokenIsValid) {
                    _data.read('users', phone, (err, data) => {
                        if (!err && data) {
                            _data.delete('users', phone, err => {
                                if (!err) cb(200)
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
  MISC.
=============================*/

handlers.ping = (data, cb) => cb(200);
handlers.notfound = (data, cb) => cb(404);

module.exports = handlers;