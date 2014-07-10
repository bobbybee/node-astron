var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;

var msgtypes = require("./msgtypes");

var DistributedClass = require("./DistributedClass");
var DCFile = require("./DCFile");

function StateServer(channel) {
    this.channel = channel;
}

StateServer.prototype.handleDatagram = function(dgram) {
    console.log("State server message "+dgram.msgtype);
    
    switch (dgram.msgtype) {
    case msgtypes.STATESERVER_CREATE_OBJECT_WITH_REQUIRED:
        {
            var do_id = dgram.readUInt32();
            var parent_id = dgram.readUInt32();
            var zone_id = dgram.readUInt32();
            var dclass_id = dgram.readUInt16();
            
            var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id);
            obj.unpack(dgram, false);
            
            console.log("-----");
            console.log("New object");
            console.log("Type: "+obj.class_t);
            console.log("DoID: "+do_id);
            console.log("Parent ID: "+parent_id);
            console.log("Properties: "+JSON.stringify(obj.properties));
            console.log("------");
        }
    }
}

module.exports = StateServer;