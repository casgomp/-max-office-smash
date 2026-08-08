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
const leaderboard = [];
const submittedRunIds = new Set();

function getLeaderboardPayload() {
  const runs = [...leaderboard]
    .sort((a, b) => b.score - a.score || a.finishedAt - b.finishedAt)
    .slice(0, 50);
  return { leaderboard: runs, total: leaderboard.length };
}

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
    // data = { targetId, damage, type, force }
    console.log('hitPlayer from', socket.id, '-> target', data.targetId, 'damage', data.damage);
    io.to(data.targetId).emit('youWereHit', {
      damage: data.damage,
      fromId: socket.id,
      type: data.type,
      force: data.force,
    });
  });

  socket.on('submitScore', (data, reply) => {
    const runId = String(data?.runId || `${socket.id}:${Date.now()}`);
    if (!submittedRunIds.has(runId)) {
      submittedRunIds.add(runId);
      leaderboard.push({
        id: runId,
        name: String(data?.name || 'Player').trim().slice(0, 16) || 'Player',
        score: Math.max(0, Math.floor(Number(data?.score) || 0)),
        destroyedTrucks: Math.max(0, Math.floor(Number(data?.destroyedTrucks) || 0)),
        finishedAt: Date.now(),
      });
    }

    const payload = getLeaderboardPayload();
    const rank = [...leaderboard]
      .sort((a, b) => b.score - a.score || a.finishedAt - b.finishedAt)
      .findIndex((run) => run.id === runId) + 1;
    if (typeof reply === 'function') reply({ ...payload, rank, runId });
    io.emit('leaderboardUpdated', payload);
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
