var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;

var msgtypes = require("./msgtypes");

var DistributedClass = require("./DistributedClass");
var DCFile = require("./DCFile");

var DOManager = require("./DOManager");

function StateServer(channel, class_t) {
    this.channel = channel;
    this.class_t = class_t;
}

StateServer.prototype.reflectCreate = function(zone) {
    var obj = new DistributedClass(this.class_t, zone, this.channel, this);
    DOManager.doID2do[this.channel] = obj;
    this.do = obj;
}

StateServer.prototype.handleDatagram = function(dgram) {
        
    switch (dgram.msgtype) {
    case msgtypes.STATESERVER_CREATE_OBJECT_WITH_REQUIRED:
        {
            var do_id = dgram.readUInt32();
            var parent_id = dgram.readUInt32();
            var zone_id = dgram.readUInt32();
            var dclass_id = dgram.readUInt16();
            
            var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id, do_id, this);
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
            
            var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id, do_id, this);
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
                        
            var req = DOManager.doID2do[doId].unpackField(dgram, field_id);
            
            this.do.call(req.name, req.value, dgram);
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

StateServer.prototype.createObject = function(md, sender, new_do, parentID, zone, optionals) {
    if(!optionals) optionals = [];
    
    var packet = new OutPacket();
    packet.writeMDHeader(this.channel, 
        
        optionals.length ? STATESERVER_CREATE_OBJECT_WITH_REQUIRED_OTHER
        : msgtypes.STATESERVER_CREATE_OBJECT_WITH_REQUIRED,
    
        sender);
    
    packet.writeUInt32(new_do.doID);
    packet.writeUInt32(parentID);
    packet.writeUInt32(zone);
    packet.writeUInt16(DCFile.classLookup[new_do.class_t]);
    
    new_do.pack(packet, optionals);
    md.write(packet);
}

StateServer.prototype.sendUpdate = function(md, sender, recipients, field) {
    var field_id = DCFile.reverseFieldLookup[this.class_t+"::"+field];
    
    if(!field_id) {
        console.log("Unknown field update for "+this.class_t+"::"+field);
        return;
    }
        
    var packet = new OutPacket();
    packet.writeMDHeader(recipients, msgtypes.STATESERVER_OBJECT_SET_FIELD, sender);
    packet.writeUInt32(this.channel);
    packet.writeUInt16(field_id);
    
    var args = Array.prototype.slice.call(arguments, 4); // js voodoo
    this.do.packField(packet, field_id, args);
       
    md.write(packet);
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