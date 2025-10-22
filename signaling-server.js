import { WebSocketServer, WebSocket } from 'ws';

const PORT = Number(process.env.PORT || 3000);

const rooms = new Map(); // roomCode -> { host, hostInfo, clients: Map, counter }

function getRoom(code){
  if(!rooms.has(code)){
    rooms.set(code, { host: null, hostInfo: null, clients: new Map(), counter: 1 });
  }
  return rooms.get(code);
}

function send(ws, data){
  if(!ws || ws.readyState !== WebSocket.OPEN) return;
  try{
    ws.send(JSON.stringify(data));
  }catch(err){
    console.error('Failed to send message', err);
  }
}

function cleanupConnection(ws){
  const meta = ws.meta;
  if(!meta) return;
  const room = rooms.get(meta.room);
  if(!room) return;

  if(meta.role === 'host'){
    room.host = null;
    room.hostInfo = null;
    room.clients.forEach((client)=>{
      send(client, { type: 'peer-left', peerId: 'host' });
      try{ client.close(); }catch(e){}
    });
    room.clients.clear();
  } else if(meta.role === 'join'){
    room.clients.delete(meta.peerId);
    if(room.host){
      send(room.host, { type:'peer-left', peerId: meta.peerId });
    }
  }

  if(!room.host && room.clients.size === 0){
    rooms.delete(meta.room);
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`Signaling server listening on ws://0.0.0.0:${PORT}`);

wss.on('connection', ws=>{
  ws.meta = null;

  ws.on('message', raw=>{
    let msg;
    try{
      msg = JSON.parse(raw.toString());
    }catch(err){
      send(ws, { type:'error', message:'Invalid JSON' });
      return;
    }

    if(msg.type === 'hello'){
      const roomCode = String(msg.room || 'default');
      const role = msg.role === 'host' ? 'host' : 'join';
      const room = getRoom(roomCode);

      if(role === 'host'){
        if(room.host && room.host !== ws){
          send(ws, { type:'error', message:'Host already connected for this room.' });
          return;
        }
        room.host = ws;
        room.hostInfo = { name: msg.name || 'Host', playerId: msg.playerId || 'host' };
        ws.meta = { room: roomCode, role:'host', peerId:'host', name: room.hostInfo.name, playerId: room.hostInfo.playerId };
        send(ws, { type:'welcome', id:'host' });
        return;
      }

      if(!room.host){
        send(ws, { type:'error', message:'No host present in this room.' });
        return;
      }

      const peerId = `peer-${room.counter++}`;
      ws.meta = {
        room: roomCode,
        role:'join',
        peerId,
        name: msg.name || peerId,
        playerId: msg.playerId || peerId
      };
      room.clients.set(peerId, ws);
      send(ws, { type:'welcome', id: peerId });
      send(room.host, { type:'join-request', peerId, name: ws.meta.name, playerId: ws.meta.playerId });
      return;
    }

    const meta = ws.meta;
    if(!meta){
      send(ws, { type:'error', message:'Identify with a hello message first.' });
      return;
    }

    const room = rooms.get(meta.room);
    if(!room){
      send(ws, { type:'error', message:'Room no longer exists.' });
      return;
    }

    if(msg.type === 'offer' && meta.role === 'host'){
      const target = room.clients.get(msg.target);
      if(!target){
        send(ws, { type:'error', message:`Peer ${msg.target} not found.` });
        return;
      }
      send(target, { type:'offer', peerId:'host', name: room.hostInfo?.name, playerId: room.hostInfo?.playerId, sdp: msg.sdp });
      return;
    }

    if(msg.type === 'answer' && meta.role === 'join'){
      if(room.host){
        send(room.host, { type:'answer', peerId: meta.peerId, sdp: msg.sdp });
      }
      return;
    }

    if(msg.type === 'ice'){
      if(meta.role === 'host'){
        const target = room.clients.get(msg.target);
        if(target){
          send(target, { type:'ice', peerId:'host', candidate: msg.candidate });
        }
      } else if(meta.role === 'join' && room.host){
        send(room.host, { type:'ice', peerId: meta.peerId, candidate: msg.candidate });
      }
      return;
    }

    if(msg.type === 'peer-left' && meta.role === 'join'){
      cleanupConnection(ws);
      return;
    }

    send(ws, { type:'error', message:`Unhandled message type: ${msg.type}` });
  });

  ws.on('close', ()=>{
    cleanupConnection(ws);
  });

  ws.on('error', err=>{
    console.error('WebSocket error', err);
    cleanupConnection(ws);
  });
});

