io.on("connection", (socket) => {
  socket.on("join", ({ docId, user }) => {
    socket.join(docId);
    socket.to(docId).emit("user-joined", user);

    io.to(docId).emit("users-in-room", getUsersInRoom(docId));
  });

  socket.on("disconnecting", () => {
    const docId = [...socket.rooms][1]; // skip socket.id
    socket.to(docId).emit("user-left", socket.user);
  });
});

function getUsersInRoom(docId) {
  const room = io.sockets.adapter.rooms.get(docId);
  const userList = [];
  if (room) {
    for (const socketId of room) {
      const userSocket = io.sockets.sockets.get(socketId);
      if (userSocket?.user) userList.push(userSocket.user);
    }
  }
  return userList;
}
