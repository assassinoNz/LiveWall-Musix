import "reflect-metadata";

import * as http from "http";

import * as express from "express";
import * as socketIo from "socket.io";

import { musixRouter } from "./routers/MusixRouter";

/*
=====================================================================================
app & io: Setup
=====================================================================================
*/
const port: number = 8080;
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
server.listen(port);
/*
=====================================================================================
app: Router Setup
=====================================================================================
*/
app.use("/musix", musixRouter);
/* 
=====================================================================================
io: Listeners Setup
=====================================================================================
*/
io.of("/musix").on("connection", (socket) => {
    socket.on("broadcast-event", (params) => {
        //NOTE: "broadcast-event" event broadcasts a given event to all of its clients
        socket.broadcast.emit(params.eventName, params);
    });
});

console.log(`Express server status: Ready. Listening on port ${port}`);