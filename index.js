const http = require('http');
const url = require('url');
const { StringDecoder } = require('string_decoder');

/*=============================
  Routes Handlers
=============================*/

const handlers = {};
handlers.sample = (data, cb) => cb(406, {'name': 'sample handler'});
handlers.notfound = (data, cb) => cb(404);

const router = {
    'sample': handlers.sample
};

/*=============================
  HTTP Server
=============================*/

const server = http.createServer((req, res) => {
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

        const routehandler = typeof(router[path]) !== 'undefined'
            ? router[path]
            : handlers.notfound

        const data = {
            path,
            query,
            method,
            headers,
            payload: buffer
        };

        routehandler(data, (statusCode, payload) => {
            statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
            payload = typeof(payload) === 'object' ? payload : {};
            payload = JSON.stringify(payload);

            res.writeHead(statusCode);
            res.end(payload);
            console.log('RESPONSE: ', statusCode, payload);
        });  
    });

});


/*=============================
   Port Listener
=============================*/

server.listen(3000, () => console.log('Server listening on: http://localhost:3000/'));

