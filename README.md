# A day in the life of alex14534

the only thing i want to put in here is
To enable internet multiplayer you now need a small Node.js signaling relay:

1. Install dependencies: `npm install`
2. Start the relay: `npm start`
3. Share the machine's public address and port with friends (default `ws://<your-ip>:3000`).
4. In the in-game network panel enter the server URL and a room code, then click **Host** or **Join**.

The relay only handles WebRTC handshake messages — gameplay traffic stays peer-to-peer.

yeah that, now anyone can play online!
