A websocket server to exchange game data between players.

The payload transmitted by the websocket is as lightweight as possible. Instead of passing the whole game data or even the diff, it is up to the client to execute the logic that will update the view from the event provided by the server.

Only one of the clients (the host) is considered as the source of truth. Other clients are considered as guests. The host is responsible for sending the whole game state to the data store. When clients connect, they load the whole game from the data store.
