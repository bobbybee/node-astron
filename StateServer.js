var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;

var msgtypes = require("./msgtypes");

var DistributedClass = require("./DistributedClass");
var DCFile = require("./DCFile");

function StateServer(channel) {
    this.channel = channel;
}

var distributedObjs = {}; // TODO: PROPER TRACKING

StateServer.prototype.handleDatagram = function(dgram) {
    
    switch (dgram.msgtype) {
    case msgtypes.STATESERVER_CREATE_OBJECT_WITH_REQUIRED:
        {
            var do_id = dgram.readUInt32();
            var parent_id = dgram.readUInt32();
            var zone_id = dgram.readUInt32();
            var dclass_id = dgram.readUInt16();
            
            var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id);
            obj.unpack(dgram, false);
            
            distributedObjs[do_id] = obj;
            
            console.log("-----");
            console.log("New object");
            console.log("Type: "+obj.class_t);
            console.log("DoID: "+do_id);
            console.log("Parent ID: "+parent_id);
            console.log("Properties: "+JSON.stringify(obj.properties));
            console.log("------");
        }
        break;
    case msgtypes.STATESERVER_OBJECT_SET_FIELD:
        {
            var doId = dgram.readUInt32();
            var field_id = dgram.readUInt16();
            
            console.log(distributedObjs[doId].unpackField(dgram, field_id));
        }
        break;
    default:
        console.log("State server message "+dgram.msgtype);
    console.log("Unknown dgram:");
    console.log(dgram.buf);
    }
}

StateServer.prototype.getZonesObjects = function(md, sender, context, parent, zones) {
    var packet = new OutPacket();
    
    if(!Array.isArray(zones)) zones = [zones]; // requirement, TODO patch Astron then remove this line
    
    var multizone = Array.isArray(zones);
    
    packet.writeMDHeader(
        parent, 
        
        multizone ? msgtypes.STATESERVER_OBJECT_GET_ZONES_OBJECTS
                  : msgtypes.STATESERVER_OBJECT_GET_ZONE_OBJECTS,
                  
        sender          
    );
    
    packet.writeUInt32(context);
    packet.writeUInt32(parent);
    
    if(multizone) {
        packet.writeUInt16(zones.length);
        
        for(var i = 0; i < zones.length; ++i) {
            packet.writeUInt32(zones[i]);
        }
    } else {
        packet.writeUInt32(zones);
    }
    
    md.write(packet);
}

module.exports = StateServer;