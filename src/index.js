const WebSocket = require('ws');
const { Server: WebSocketServer } = WebSocket;
const { v4: uuid } = require('uuid');
const {
    WEBSOCKET_EVENT_JOIN,
    WEBSOCKET_EVENT_DISCONNECTED,
    WEBSOCKET_EVENT_SELECT,
    WEBSOCKET_EVENT_SET_OPTION
} = require('./constants');

module.exports = class GameSocketServer {
    constructor({ server }) {
        this.server = new WebSocketServer({ server });
        this.server.on('connection', this.handleNewConnection);
        this.server.on('close', event => console.log('closed', event));
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
        client.userId = null;
        client.games = [];
        client.on('message', payload => this.handleNewMessage(payload, client));
        client.on('close', code => this.handleClientClose(code, client));
    };

    handleNewMessage = (payload, client) => {
        const parsedPayload = GameSocketServer.parse(payload);
        console.log({ input: parsedPayload, from: client.id });
        switch (parsedPayload.event) {
            default: {
                console.error('Unhandled payload.', { payload });
                return;
            }
            case WEBSOCKET_EVENT_JOIN: {
                this.handleJoinGame(parsedPayload, client);
                return;
            }
            case WEBSOCKET_EVENT_SELECT: {
                this.broadcast(
                    {
                        event: WEBSOCKET_EVENT_SELECT,
                        ...parsedPayload
                    },
                    client.id
                );
                return;
            }
            case WEBSOCKET_EVENT_SET_OPTION: {
                this.broadcast(
                    {
                        event: WEBSOCKET_EVENT_SET_OPTION,
                        ...parsedPayload
                    },
                    client.id
                );
                return;
            }
        }
    };

    handleJoinGame(payload, client) {
        if (!client.userId) {
            client.userId = payload.playerId;
        }

        let game = null;
        this.server.clients.forEach(cl => {
            const gameIndex = this.findGameIndexInClient(payload, cl);
            if (gameIndex !== -1) {
                if (!cl.games[gameIndex].player1) {
                    game = this.addPlayer1ToGameObject(
                        payload,
                        cl.games[gameIndex]
                    );
                } else if (!cl.games[gameIndex].player2) {
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

    handleClientClose(code, client) {
        client.games.forEach(game => {
            this.server.clients.forEach(cl => {
                const gameIndex = this.findGameIndexInClient(game, client);
                if (gameIndex !== 1) {
                    let game = client.games[gameIndex];
                    if (game.player2 === client.userId) {
                        game = {
                            ...game,
                            player2: null
                        };
                    }

                    if (game.player1 === client.userId) {
                        game = {
                            ...game,
                            player1: null
                        };
                    }

                    if (game.spectators.includes(client.userId)) {
                        game = {
                            ...game,
                            spectators: game.spectators.filter(
                                spectatorId => spectatorId !== client.userId
                            )
                        };
                    }
                    cl.games[gameIndex] = game;
                }
            });
            this.broadcast({
                event: WEBSOCKET_EVENT_DISCONNECTED,
                playerId: client.userId,
                gameId: game.gameId
            });
        });
    }

    findGameIndexInClient(payload, client) {
        return client.games
            .filter(game => game.gameId)
            .findIndex(game => {
                return game.gameId === payload.gameId;
            });
    }

    findGameInClient(payload, client) {
        return client.games.map(game => game.gameId).includes(payload.gameId);
    }

    createNewGameObject(payload) {
        return {
            gameId: payload.gameId,
            player1: payload.playerId,
            player2: null,
            spectators: []
        };
    }

    addPlayer1ToGameObject(payload, game) {
        return {
            ...game,
            player1: payload.playerId
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
            if (!this.findGameInClient(payload, client)) {
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
        console.log('----------');
    }
};
