const config = require('./config');
const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { StringDecoder } = require('string_decoder');
const handlers = require('./handlers');
const helpers = require('./helpers');
const util = require('util');
const debug = util.debuglog('server');


const server = {};

/*=============================
  Router
=============================*/

server.router = {
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks,
    'ping': handlers.ping
};

/*=============================
  HTTP Server
=============================*/

server.unifiedServer = (req, res) => {
    const parsedURL = url.parse(req.url, true);
    const parsedPath = parsedURL.pathname.replace(/^\/+|\/+$/g, '');
    const query = parsedURL.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;
    let buffer = '';
    let decoder = new StringDecoder('utf-8');

    req.on('data', data => buffer += decoder.write(data));
    req.on('end', () => {
        buffer += decoder.end();

        const routehandler = typeof (server.router[parsedPath]) !== 'undefined'
            ? server.router[parsedPath]
            : handlers.notfound

        const data = {
            parsedPath,
            query,
            method,
            headers,
            payload: helpers.parseJsonToObject(buffer)
        };

        routehandler(data, (statusCode, payload) => {
            debug(data)
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;
            payload = typeof (payload) === 'object' ? payload : {};
            payload = JSON.stringify(payload);

            res.writeHead(statusCode);
            res.end(payload);
            debug('RESPONSE: ', statusCode, payload);
        });
    });
};

/*=============================
  INIT / EXPORT
=============================*/

server.init = () => {
    server.httpServer = http.createServer((req, res) => server.unifiedServer(req, res));
    server.httpsServerOptions = { key: fs.readFileSync(path.join(__dirname, '../https/key.pem')), cert: fs.readFileSync(path.join(__dirname, '../https/cert.pem')) };
    server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => server.unifiedServer(req, res));
    
    server.httpServer.listen(config.port.http, () => console.log('\x1b[36m%s\x1b[0m', `Server listening on: http://localhost:${config.port.http}/ | ${config.env}`));
    server.httpsServer.listen(config.port.https, () => console.log('\x1b[35m%s\x1b[0m', `Server listening on: https://localhost:${config.port.https}/ | ${config.env}`));
};


module.exports = server;