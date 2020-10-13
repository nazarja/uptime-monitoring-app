const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.users = (data, cb) => {
    const acceptMethods = ['get', 'post', 'put', 'delete'];
    if (acceptMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, cb);
    }
    else cb(405)
};

handlers._users = {
    get: (data, cb) => {
        if (data.query.phone) {
            const phone = typeof (data.query.phone) && data.query.phone.trim().length === 10
                ? data.query.phone.trim()
                : false;

            _data.read('users', phone, (err, data) => {
                if (!err && data) {
                    // remove password hash
                    delete data.hash;
                    cb(200, data);
                }
                else cb(404);
            })
        }
        else cb(400, { 'Error': 'Missing required field' })
    },

    post: (data, cb) => {
        const checker = (payload, length) => {
            return typeof (payload) === 'string' && payload.trim().length >= length
                ? payload.trim()
                : false;
        };

        const firstName = checker(data.payload.firstName, 1);
        const lastName = checker(data.payload.lastName, 1);
        const phone = checker(data.payload.phone, 10);
        const password = checker(data.payload.password, 1);
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

    put: (data, cb) => {
        if (data.payload.phone) {
            const checker = (payload, length) => {
                return typeof (payload) === 'string' && payload.trim().length >= length
                    ? payload.trim()
                    : false;
            };
    
            const firstName = checker(data.payload.firstName, 1);
            const lastName = checker(data.payload.lastName, 1);
            const phone = checker(data.payload.phone, 10);
            const password = checker(data.payload.password, 1);

            if (phone) {
                if (firstName || lastName || password) {
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            if (firstName) userData.firstName = firstName;
                            if (lastName) userData.lastName = lastName;
                            if (password) userData.hash = helpers.hash(password);

                            _data.update('users', phone, userData, err => {
                                if  (!err) cb(200)
                                else cb(500, { 'Error': 'Could not update the user'});
                            })
                        }
                        else cb(400, { 'Error': 'The specified user does not exist'});
                    })
                }
                else cb(400, {'Error': 'Missing required fields to update'})
            }
            else cb(400, { 'Error': 'Missing required field' });

        }
        else cb(400, { 'Error': 'Missing required field' });
    },

    delete: (data, cb) => {
        if (data.query.phone) {
            const phone = typeof (data.query.phone) && data.query.phone.trim().length === 10
                ? data.query.phone.trim()
                : false;

            _data.read('users', phone, (err, data) => {
                if (!err && data) {
                   _data.delete('users', phone, err => {
                       if (!err) cb(200)
                       else cb(500, {'Error': 'Could not delete the specified user'});
                   })
                }
                else cb(400, {'Error': 'Could not find the specified user'});
            })
        }
        else cb(400, { 'Error': 'Missing required field' })
    },
};

handlers.ping = (data, cb) => cb(200);
handlers.notfound = (data, cb) => cb(404);

module.exports = handlers;