const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*" // allows any client to connect - fine for dev/jam, tighten later if needed
  }
});

const PORT = process.env.PORT || 3000;

const players = {}; // keeps track of every connected player's data

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  // tell the newly connected player about everyone already here
  socket.emit('currentPlayers', players);

  // when this player sends their position, save it and tell everyone else
  socket.on('updatePosition', (data) => {
    players[socket.id] = data; // data = { x, y, z, rotation }
    socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
  });

  // relay a shot to everyone else, so they see the projectile too
  socket.on('playerShoot', (data) => {
    socket.broadcast.emit('otherPlayerShoot', { id: socket.id, ...data });
  });

  // relay a hit to the specific player who got hit
  socket.on('hitPlayer', (data) => {
    // data = { targetId, damage }
    io.to(data.targetId).emit('youWereHit', { damage: data.damage, fromId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id); // tell everyone this player is gone
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
