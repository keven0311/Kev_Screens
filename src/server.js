require('dotenv').config();
const fs = require('fs');
const https = require('https')
const path = require('path')
const express = require('express');
const socketio = require('socket.io');
const corsConfig = require('./config/corsConfig')

const PORT = process.env.PORT;
const BASE_URL = process.env.BASE_URL || "localhost";

const app = express();
app.use(express.static(path.join(__dirname,'pages')))

// key and cert for running HTTPS:
const key = fs.readFileSync('./certs/cert.key');
const cert = fs.readFileSync('./certs/cert.crt');

// express server running on HTTPS with the key and cert
const expressServer = https.createServer({key, cert}, app);

const io = socketio(expressServer,corsConfig);

expressServer.listen(PORT, () => {
    console.log( `Express server running on https://${BASE_URL}:${PORT}`)
});

// variables:
const audieceList = new Map();


io.on('connection',(socket)=>{
    console.log("Someone has connected",socket.id);
    const currentUserName = socket.handshake.auth.userName;
    // const password = socket.handshake.auth.password;

    // if(password !== "x"){
    //     socket.disconnect(true);
    //     return;
    // }
    const currentAudience = audieceList.get(socket.io)

    socket.on('join-room', (data) => {
        console.log("recived data on 'join-room': ", data)
        const { roomId , role, userName } = data
        socket.join(roomId);
        console.log(`${currentAudience?.userName}: ${socket.id} joined room: ${roomId}`)
        socket.to(roomId).emit('peer-joined', { socketId: socket.id, role, userName });
        if(!currentAudience || role != "streamer"){
            audieceList.set(socket.id, {
                role: role,
                userName: userName,
                joinedRoom: roomId
            })
        }else{
            currentAudience.joinedRoom = roomId;
        }
        
        socket.on('disconnect', () => {
            socket.to(roomId).emit('peer-disconnected', {socketId:socket.id});
            if(audieceList.has(socket.id)){
                audieceList.delete(socket.id)
            }
        });
    });

    socket.on("leaveRoom", (roomId) => {
        socket.leave(roomId);
        currentAudience.joinedRoom = null;
        console.log(`${socket.id} left room: ${roomId}`)
    })


    // RTCPeerConnection signling services:
    socket.on("offer", (data) =>{
        console.log(`Recived offer from ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on("answer", (data) => {
        console.log(`Recivied answer ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit("answer",data);
    });

    socket.on("icecandidate", (data) => {
        console.log(`Recived ICECandidate from ${data.socketId} in room ${data.roomId}`)
        socket.to(data.roomId).emit('icecandidate',data);
    });


    // Chat room message singling services:
    socket.on("chat-room", (data) => {

    })


    socket.on("disconnect", () => {
        console.log("User disconnected: ",socket.id)
    });

});