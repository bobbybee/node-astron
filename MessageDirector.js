var net = require('net');
var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;


function MessageDirector(ip, port) {
    this.ip = ip;
    this.port = port;
    this.socket = null;
    this.connected = false;
}

MessageDirector.prototype.connect = function(callback) {
    var _this = this;
    
    var s = net.connect(this.port, this.ip, function() {
        _this.socket = s;
        _this.onConnect();
        callback();
    });
}

MessageDirector.prototype.onConnect = function() {
    this.connected = true;
    
    this.socket.on('data', this.onData);
    this.socket.on('end', this.onEnd);
}

MessageDirector.prototype.onData = function(d) {
    var packet = new Packet(d);
    packet.readMDHeader();
    
    console.log(packet.recipients);
    console.log(packet.sender);
    console.log(packet.msgtype);
}

MessageDirector.prototype.onEnd = function() {
    this.connected = false;
}

MessageDirector.prototype.write = function(dgram) {
    this.socket.write(dgram);
}

module.exports = MessageDirector;