const express = require("express");
const app = express();
const { Server } = require("socket.io");
const http = require("http");

let count = 0;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("User Connected ", ++count);

  // to deal with joining rooms and managing rooms info
  socket.on("SetRoom", (RoomData) => {
    console.log("Line 23 : In Roooom");

    console.log("RoomData-->", RoomData);
    console.log(rooms);

    // Check if the user is already in the desired room
    if (socket.rooms.has(RoomData.id)) {
      console.log("Already in the room:", RoomData.id);
      return;
    }

    //checking if we can join requested room
    if (rooms.get(RoomData.id) ? rooms.get(RoomData.id).size <= 1 : true) {
      // To leave all room before entering into another
      // socket.leaveAll();
      // console.log(socket.rooms.has(room));
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          socket.leave(room);
        }
      });

      // Delete all entries of socket.id in Set
      rooms.forEach((entry) => {
        if (entry.has(socket.id)) {
          entry.delete(socket.id);
        }
      });

      // Enter new Room
      socket.join(RoomData.id);

      // Update Set about new room entry
      if (!rooms.has(RoomData.id)) {
        rooms.set(RoomData.id, new Set([socket.id]));
      } else {
        rooms.set(RoomData.id, new Set([...rooms.get(RoomData.id), socket.id]));
      }
    } else {
      canSendMsg = false;
      console.log(
        "Cannot join you this room, already enough people. Count:",
        rooms.get(RoomData.id).size
      );
      socket.emit(
        "CannotJoin",
        `Cannot join you this room, already enough people. Count: ${
          rooms.get(RoomData.id).size
        }`
      );
    }

    // if (rooms.get(RoomData.id).size == 1) {
    //   socket.emit("first", "You are first");
    // } //updating socket if they are first to enter

    // console.log(rooms.get(RoomData.id).size);
    // if (rooms.get(RoomData.id).size === 1) {
    //   console.log("heree4");
    //   socket.emit("chooseStartingMove", (choice) => {
    //     if (choice === "X" || choice === "O") {
    //       // Handle the user's choice here and update the socket accordingly
    //       // For example:
    //       socket.startingMove = choice;
    //       socket.emit("message", `You chose ${choice} as your starting move.`);
    //     } else {
    //       socket.emit(
    //         "message",
    //         "Invalid choice. Please choose either X or O."
    //       );
    //     }
    //   });
    // }
  });

  // to transfer choosed move from first to second players;
  socket.on("setUserMove", (response) => {
    const opponentmove = response.value == "X" ? "O" : "X";
    socket.broadcast
      .to(response.Room)
      .emit("setUserMove", { move: opponentmove, isFirst: false }); // sending opp. sign to opponent for grid layout
    socket.emit("setUserMove", { move: response.value, isFirst: true }); // sending sign to orgainser same as he choosed to grid layout
  });

  // to transfer move between players;
  socket.on("opponentReadyStatus", (response) => {
    console.log("Line 92 ", response);
    socket.broadcast
      .to(response.room)
      .emit("opponentReadyStatus", response.boolean);
  });

  // to transfer initial choice move/turns/ X or O between players;
  socket.on("sendMove", (move) => {
    console.log("Line 92 ", move);
    socket.broadcast.to(move.Room).emit("receiveMove", move);

    // socket.broadcast.emit("Move", move);
  });

  socket.on("isFirst", () => {
    console.log("Line 126", socket.rooms);
    const room = [...socket.rooms][1];
    const clientsInRoom = io.sockets.adapter.rooms.get(room);

    if (clientsInRoom && clientsInRoom.size === 1) {
      socket.emit("isFirst", true);
      console.log("trueeee");
    } else {
      socket.emit("isFirst", false);
      console.log("falseeee");
    }
    console.log(socket.rooms);
  });

  socket.on("checkOpponentReady", (roomId, callback) => {
    console.log(roomId, "roomID");
    let roomSize = rooms.get(roomId).size;
    console.log("roomSizeeeeee-> ", roomSize);
    const isOpponentReady = roomSize > 1;

    callback(isOpponentReady); // Send the response back to the client
  });

  // on disconnect
  socket.on("disconnect", () => {
    console.log("User Disconnected");

    rooms.forEach((entry) => {
      entry.delete(socket.id);
    });

    console.log(rooms);
  });
});

server.listen("2008", () => {
  console.log("Server Started");
});
