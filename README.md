# What was used

> [Node v9.8.0](https://nodejs.org/en/blog/release/v9.8.0/)
> [SOCKET.IO 2.0](https://nodejs.org/en/blog/release/v9.8.0/)
> [Redis-x64-3.2.100](https://github.com/MSOpenTech/redis/releases/download/win-3.2.100/Redis-x64-3.2.100.msi)
> [PEER JS](https://peerjs.com/)

# Instalation steps
```sh
# Download and install Redis server
# Clone repository
$ git clone https://github.com/VanyaAvchyan/WebRTC-PEERJS-video-audio-chat-multiple-connections.git
# Go to the project folder
$ cd WebRTC-PEERJS-video-audio-chat-multiple-connections/node
# Rename config-example.js file to config.js
# Change redis.host, redis.port, ... values to your own if they differ
# Node Install packages
$ npm install or node install
# Run node server
$ npm start or node server.js
# Run signaling server (ICE Candidate)
$ node peer-server.js
```

# Run the php file
 [http://localhost/WebRTC-PEERJS-video-audio-chat-multiple-connections/index.php](http://localhost/WebRTC-PEERJS-video-audio-chat-multiple-connections/index.php)