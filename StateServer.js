var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;

var msgtypes = require("./msgtypes");

var DistributedClass = require("./DistributedClass");
var DCFile = require("./DCFile");

var DOManager = require("./DOManager");

function StateServer(channel) {
    this.channel = channel;
}

StateServer.prototype.reflectCreate = function(class_t, zone) {
    var obj = new DistributedClass(class_t, zone);
    DOManager.doID2do[this.channel] = obj;
}

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
            
            DOManager.doID2do[do_id] = obj;
            
            console.log("-----");
            console.log("New object");
            console.log("Type: "+obj.class_t);
            console.log("DoID: "+do_id);
            console.log("Parent ID: "+parent_id);
            console.log("Properties: "+JSON.stringify(obj.properties));
            console.log("------");
        }
        break;
    case msgtypes.STATESERVER_OBJECT_ENTER_LOCATION_WITH_REQUIRED:
        {
            var do_id = dgram.readUInt32();
            var parent_id = dgram.readUInt32();
            var zone_id = dgram.readUInt32();
            var dclass_id = dgram.readUInt16();
            
            var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id);
            obj.unpack(dgram, false, ["broadcast"]);
            
            DOManager.doID2do[do_id] = obj;
            
            console.log("-----");
            console.log("New object w/ location");
            console.log("Type: "+obj.class_t);
            console.log("DoID: "+do_id);
            console.log("Zone ID: "+zone_id);
            console.log("Parent ID: "+parent_id);
            console.log("Properties: "+JSON.stringify(obj.properties));
            console.log("------");
        }
        break;
    case msgtypes.STATESERVER_OBJECT_SET_FIELD:
        {
            var doId = dgram.readUInt32();
            var field_id = dgram.readUInt16();

            if(!DOManager.doID2do[doId]) {
                console.log("DoID"+ doId+" doesn't exist");
                return;
            }
            
            console.log(DOManager.doID2do[doId].unpackField(dgram, field_id));
        }
        break;
    case msgtypes.STATESERVER_OBJECT_DELETE_RAM:
        {            
            var doId = dgram.readUInt32();
            
            console.log(doId);
            
            console.log("SS object deleted: ");
            console.log(DOManager.doID2do[doId]);
            
            DOManager.doID2do[doId] = null;
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