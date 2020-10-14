const config = require('./lib/config');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const { StringDecoder } = require('string_decoder');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

/*=============================
  Router
=============================*/

const router = {
    'users': handlers.users,
    'tokens': handlers.tokens,
    'ping': handlers.ping
};

/*=============================
  HTTP Server
=============================*/

const httpServer = http.createServer((req, res) => server(req, res));
const httpsServerOptions = { key: fs.readFileSync('./https/key.pem'), cert: fs.readFileSync('./https/cert.pem') };
const httpsServer = https.createServer(httpsServerOptions, (req, res) => server(req, res));

const server = (req, res) => {
    const parsedURL = url.parse(req.url, true);
    const path = parsedURL.pathname.replace(/^\/+|\/+$/g, '');
    const query = parsedURL.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    let buffer = '';
    let decoder = new StringDecoder('utf-8');

    req.on('data', data => buffer += decoder.write(data));
    req.on('end', () => {
        buffer += decoder.end();

        const routehandler = typeof (router[path]) !== 'undefined'
            ? router[path]
            : handlers.notfound

        const data = {
            path,
            query,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        routehandler(data, (statusCode, payload) => {
            console.log(data)
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;
            payload = typeof (payload) === 'object' ? payload : {};
            payload = JSON.stringify(payload);

            res.writeHead(statusCode);
            res.end(payload);
            console.log('RESPONSE: ', statusCode, payload);
        });
    });
};


/*=============================
   Port Listener
=============================*/

httpServer.listen(config.port.http, () => console.log(`Server listening on: http://localhost:${config.port.http}/ | ${config.env}`));
httpsServer.listen(config.port.https, () => console.log(`Server listening on: https://localhost:${config.port.https}/ | ${config.env}`));