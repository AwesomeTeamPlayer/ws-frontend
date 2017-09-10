var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var amqp = require('amqp');
var request = require('ajax-request');

var frontendId = process.env.FRONTEND_ID;
var queueHost = process.env.QUEUE_HOST;
var queuePort = process.env.QUEUE_PORT;
var frontendApiHost = process.env.FRONTEND_API_HOST;
var frontendApiPort = process.env.FRONTEND_API_PORT;

function getUniqueConnectionId() {
    return (new Date()).getTime() + '' + Math.round(Math.random() * 10000000000) + 'abc';
}
var connections = [];

app.use(function (req, res, next) {
    return next();
});

app.get('/', function(req, res, next){
    console.log('get route', req.testing);
    res.send('hello world!');
});

app.ws('/', function(ws, req) {

    req.connectionId = getUniqueConnectionId();

    connections[req.connectionId] = {
        req: req,
        ws: ws
    };

    ws.on('message', function(message) {
        var jsonMessage = JSON.parse(message);
        jsonMessage.clientId = frontendId + '-' + req.connectionId;
        request({
            url: frontendApiHost + ':' + frontendApiPort,
            method: 'POST',
            data: jsonMessage
        }, function(err, res, body) {
            ws.send(body)
        });
    });

    ws.on('close', function(msg) {
        delete connections[req.connectionId];
    });
});

app.listen(3000);



var rabbitMqConnection = amqp.createConnection({ host: queueHost, port: queuePort});

rabbitMqConnection.on('error', function(e) {
    console.log("Error from amqp: ", e);
});

rabbitMqConnection.on('ready', function () {
    rabbitMqConnection.queue('notification-' + frontendId, function (q) {
        q.bind('#');

        // Receive messages
        q.subscribe(function (message) {
            var jsonMessage = JSON.parse(message.data.toString('utf8'));

            if (jsonMessage.connectionId === undefined || jsonMessage.message === undefined) {
                return;
            }

            if (connections[jsonMessage.connectionId] === undefined) {
                return;
            }

            connections[jsonMessage.connectionId].ws.send(
                JSON.stringify(jsonMessage.message)
            );
        });
    });
});
