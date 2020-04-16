A websocket server to exchange chess game data between players.

## Payloads

The JSON payload transmitted by the websocket is as lightweight as possible. Instead of passing the whole game data or even the diff between the old and new data, it is up to the client to execute the logic that will update the view from the event provided by the websocket server. As a consequence, it is crucial that clients run the same version of the application (see below).

When clients connect, they load the whole game from the data store. After that, data provided by the websocket server is used to patch the game state locally. In other words, these updates are optimistic until the game is reloaded entirely by the client (i.e., if the player reloads the page).

## Host and guests

Only one of the clients (the host) is considered as the source of truth. Other clients are considered as guests. Since chess is a two-player game, there is typically only one host and one guest. However, in order to keep the application scalable, we will assume that there can be more than one guest.

When a game is saved for the first time in the data store, the player who sent the game data first is given the role of host and other players are automatically considered as guests.

The host is responsible for sending the whole game state to the data store to save it. This part of the logic is not executed by the websocket but by the client and the lambda functions.

## Spectators and AI-only games

On top of their host or guest role, clients can also be spectators. Guests who are spectators can receive but not send messages over websocket. Only spectating hosts can do both.

Typically, having a spectating host makes the most sense for a game where AIs play against each other and guests are also spectating.

## Client version

Players who run different client versions is an edge case since the code to run the client is hosted on a web server. It is still a possible problem since the code is executed locally by the player's machine. This issue could arise if the client codebase was updated and only one of the players reloaded the page. The other player would still be using the old version of the client, which could cause issues when patching the game state. Therefore, it is important that a client sends the version of the code (aka `gameVersion`) that they are executing to the other clients when they load the page. Here is an example payload that broadcasts this information to clients subscribed to the websocket:

  { "gameId": "b09bf1c1-daaf-4753-a4eb-391bfb569ace.json", "gameVersion": "0.2.3" }

## Spectators


