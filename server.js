const WebSocket = require('ws');

const ws = new WebSocket.Server({ port: '3000' });

ws.on('open', function open() {
    ws.send('something');
});

ws.on('message', function incoming(data) {
    console.log(data);
});
