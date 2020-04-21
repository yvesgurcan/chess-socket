const WebSocket = require('ws');
const { v4: uuid } = require('uuid');
const { WEBSOCKET_EVENT_SELECT, WEBSOCKET_EVENT_JOIN } = require('./constants');

module.exports = class GameSocketServer {
    constructor({ port }) {
        this.port = port;
        this.server = new WebSocket.Server({ port });
        this.server.on('connection', this.handleNewConnection);
    }

    static parse(payload) {
        try {
            return JSON.parse(payload);
        } catch (error) {
            console.error("Can't parse payload.", { payload });
            return '';
        }
    }

    static stringify(payload) {
        try {
            return JSON.stringify(payload);
        } catch (error) {
            console.error("Can't stringify payload.", { payload });
            return '';
        }
    }

    handleNewConnection = client => {
        client.id = uuid();
        client.games = [];
        client.on('message', payload => this.handleNewMessage(payload, client));
    };

    handleNewMessage = (payload, client) => {
        const parsedPayload = GameSocketServer.parse(payload);
        console.log({ input: parsedPayload, from: client.id });
        if (parsedPayload.join) {
            this.handleJoinGame(parsedPayload, client);
        } else if (parsedPayload.gameId) {
            this.broadcast(
                {
                    event: WEBSOCKET_EVENT_SELECT,
                    ...parsedPayload
                },
                client.id
            );
        }
    };

    handleJoinGame(payload, client) {
        let game = null;
        this.server.clients.forEach(cl => {
            const gameIndex = this.findGameIndexInClient(payload, cl);
            if (gameIndex !== -1) {
                if (!cl.games[gameIndex].player2) {
                    game = this.addPlayer2ToGameObject(
                        payload,
                        cl.games[gameIndex]
                    );
                } else {
                    game = this.addSpectatorToGameObject(
                        payload,
                        cl.games[gameIndex]
                    );
                }
                cl.games[gameIndex] = game;
            }
        });

        if (!game) {
            game = this.createNewGameObject(payload);
        }

        client.games.push(game);
        this.broadcast({ event: WEBSOCKET_EVENT_JOIN, ...game });
    }

    findGameIndexInClient(payload, client) {
        return client.games
            .map(game => game.gameId)
            .findIndex(game => game.gameId === payload.gameId);
    }

    createNewGameObject(payload) {
        return {
            gameId: payload.join,
            player1: payload.playerId,
            player2: null,
            spectators: []
        };
    }

    addPlayer2ToGameObject(payload, game) {
        return {
            ...game,
            player2: payload.playerId
        };
    }

    addSpectatorToGameObject(payload, game) {
        if (
            payload.playerId !== game.player1 ||
            payload.playerId !== game.player2
        ) {
            return {
                ...game,
                spectators: [...game.spectators, payload.playerId]
            };
        }
    }

    broadcast(payload, ignoreClient) {
        let to = [];
        const responsePayload = GameSocketServer.stringify(payload);
        this.server.clients.forEach(client => {
            if (
                !client.games.map(game => game.gameId).includes(payload.gameId)
            ) {
                return;
            }

            if (client.id === ignoreClient) {
                return;
            }

            if (client.readyState === WebSocket.OPEN) {
                to.push(client.id);
                client.send(responsePayload);
            }
        });
        console.log({ output: payload, to });
    }
};
