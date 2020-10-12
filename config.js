const environments = {};
environments.staging = {
    port: {
        http: 3000,
        https: 3001,
    },
    env: 'staging',
};
environments.production = {
    port: {
        http: 5000,
        https: 5001,
    },
    env: 'production',
};

const currentEnvironment = typeof (process.env.NODE_ENV) === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

const exportedEnvironment = typeof (environments[currentEnvironment]) === 'object'
    ? environments[currentEnvironment]
    : environments.staging

module.exports = exportedEnvironment;
