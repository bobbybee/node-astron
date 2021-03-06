var net = require('net');

var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;

var msgtypes = require("./msgtypes");

function MessageDirector(ip, port) {
    this.ip = ip;
    this.port = port;
    this.socket = null;
    this.connected = false;
    
    this.channels = {};
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
    
    var _this = this;
    
    this.socket.on('data', function(d) {
        _this.onData(d);
    });
    this.socket.on('end', function() {
        _this.onEnd();
    });
}

MessageDirector.prototype.onData = function(d) {
    var packet = new Packet(d);
    packet.readMDHeader();
            
    nextRecipient: for(var i = 0; i < packet.recipients.length; ++i) {
        if(!this.channels[packet.recipients[i]]) {
            continue nextRecipient; // message was not intended for us, move on
        }
        this.channels[packet.recipients[i]].handleDatagram(packet);
    }
}

MessageDirector.prototype.onEnd = function() {
    this.connected = false;
}

MessageDirector.prototype.write = function(dgram) {
    this.socket.write(dgram.serialize());
}

var MD_CONTROL = 1;

MessageDirector.prototype.setName = function(name) {
    var packet = new OutPacket();
    packet.writeMDHeader(MD_CONTROL, msgtypes.CONTROL_SET_CON_NAME);
    packet.writeString(name);
    this.write(packet);
}

MessageDirector.prototype.addChannel = function(channel, controller) {
    var packet = new OutPacket();
    packet.writeMDHeader(MD_CONTROL, msgtypes.CONTROL_ADD_CHANNEL);
    packet.writeUInt64(channel);
    this.write(packet);
    
    this.channels[channel] = controller;
}

MessageDirector.prototype.removeChannel = function(channel) {
    var packet = new OutPacket();
    packet.writeMDHeader(MD_CONTROL, msgtypes.CONTROL_REMOVE_CHANNEL);
    packet.writeUInt64(channel);
    this.write(packet);
    
    this.channels[channel] = null;
}

module.exports = MessageDirector;