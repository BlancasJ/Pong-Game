let readyPlayerCount = 0;

function listen(io) {
  const pongNamespace = io.of("/pong");

  pongNamespace.on("connection", (socket) => {
    console.log("readyPlayerCount: ", readyPlayerCount);
    let room;
    console.log("A user connected");

    socket.on("ready", () => {
      room = "room" + Math.floor(readyPlayerCount / 2);
      socket.join(room);
  
      console.log("Player ready", socket.id, room);

      readyPlayerCount++;

      if ((readyPlayerCount % 2) === 0) {
        pongNamespace.in(room).emit("startGame", socket.id);
        console.log("readyPlayerCount: ", readyPlayerCount);
      }
    })

    socket.on("paddleMove", (paddleData) => {
      socket.to(room).emit("paddleMove", paddleData);
    });

    socket.on("ballMove", (ballData) => {
      socket.to(room).emit("ballMove", ballData);
    });

    socket.on("restart", async () => {
      const clients = await pongNamespace.in(room).fetchSockets();

      clients?.map((clientSocket) => {
        clientSocket.leave(room);
        if (socket.id !== clientSocket.id) {
          console.log('inside if');
          clientSocket.emit('loadGame');
        }
      });
    });

    socket.on("loadGame", () => {
      socket.emit("loadGame");
    });

    socket.on("disconnect", async (reason) => {
      console.log(`Client ${socket.id} disconnected: ${reason} from room: ${room}`);
      const clients = await pongNamespace.in(room).fetchSockets();
      if (clients?.length) {
        clients.map((clientSocket) => {
          clientSocket.leave(room);
        });
        readyPlayerCount -= clients.length;
      }
    })
  });
}

module.exports = {
  listen
};
