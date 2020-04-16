A websocket server to exchange chess game data between players.

## Payloads

The JSON payload transmitted by the websocket is as lightweight as possible. Instead of passing the whole game data or even the diff between the old and new data, it is up to the client to execute the logic that will update the view from the event provided by the websocket server. As a consequence, it is crucial that clients run the same version of the application (see below).

When clients connect, they load the whole game from the data store. After that, data provided by the websocket server is used to patch the game state locally. In other words, these updates are optimistic until the game is reloaded entirely by the client (i.e., if the player reloads the page).

## Host and guests

In the case where multiple clients are connected to a game at the same time, only one of the clients (the host) is considered as the source of truth. Other clients are considered as guests.

Since chess is a two-player game, there is typically only one host and one guest. However, in order to keep the application scalable, we will assume that there can be more than one guest.

When a game is saved for the first time in the data store, the player who sent the game data first is given the role of host and other players are automatically considered as guests.

The host is responsible for sending the whole game state to the data store to save it when more than one clients are simultaneously connected to the websocket server. However, if only one client is connected to the websocket server at a given time, this client (whether they are host or not) is allowed to save the game since there is much less risk of conflicting game states.

## Connection and disconnection

When a client loads a game, they send a message to other clients via websocket to notify them that they are now online:

```json
  { "gameId": "b09bf1c1-daaf-4753-a4eb-391bfb569ace.json", "connected": "98b029e0-00aa-4ab0-8efd-6560f784ce5c", "gameVersion": "0.2.3" }
```

Or that they are now offline:

```json
  { "gameId": "b09bf1c1-daaf-4753-a4eb-391bfb569ace.json", "disconnected": "98b029e0-00aa-4ab0-8efd-6560f784ce5c" }
```

It is up to the clients to keep track of which other clients are online. Based on this information, clients decide whether saving the game should be left to the host or if a guest can save the game.

## Spectators and AI-only games

On top of their host or guest role, clients can also be spectators. Guests who are spectators can receive but not send messages over websocket. Only spectating hosts can do both.

Typically, having a spectating host makes the most sense for a game where AIs play against each other and guests are also spectating.

## Client version

Players who run different client versions is an edge case since the code to run the client is hosted on a web server. It is still a possible problem since the code is executed locally by the player's machine. This issue could arise if the client codebase was updated and only one of the players reloaded the page. The other player would still be using the old version of the client, which could cause issues when patching the game state. Therefore, it is important that a client sends the version of the code (aka `gameVersion`) that they are executing to the other clients when they are connected (see example payload above).
