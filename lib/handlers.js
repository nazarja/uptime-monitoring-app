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
    get: (data, cb) => { },
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
                                    cb(500, {'Error': 'Could not create the new user'})
                                }
                            });
                        }
                        else cb(500, {'Error': 'Could not hash the user\s password'})
                    }
                    else cb(400, { 'Error': 'A user with that phone number already exists' });
                })
            )
            : cb(400, { 'Error': 'Missing required fields' });

    },
    put: (data, cb) => { },
    delete: (data, cb) => { },
};

handlers.ping = (data, cb) => cb(200);
handlers.notfound = (data, cb) => cb(404);

module.exports = handlers;