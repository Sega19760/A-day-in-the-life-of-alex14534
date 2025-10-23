# sega19760.gitbub.io

## Multiplayer signaling server

To enable internet multiplayer you now need a small Node.js signaling relay:

1. Install dependencies: `npm install`
2. Start the relay: `npm start` (or `node signaling-server.js`)
3. Expose the port to the public internet. For example, with ngrok run `ngrok http 3000` and copy the generated `https://...ngrok-free.app` address.
4. In the in-game network panel paste the matching `wss://...` URL, then click **Browse Lobbies** to pick a room or **Create Lobby** to host with a custom name and capacity.

The relay now exposes `GET /rooms` for the lobby browser so every client can discover public rooms. Only WebRTC handshake data flows through the server — all gameplay packets remain peer-to-peer.
