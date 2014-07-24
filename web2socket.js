var net = require('net');
var WebSocketServer = require("websocket").server;

var Packet = require("./Packet").Packet;
var OutPacket = require("./Packet").OutPacket;
var msgtypes = require("./msgtypes");

var DCFile = require("./DCFile");
var DistributedClass = require("./DistributedClass");

var client = net.createConnection(6667, "localhost", function() {
	client.on('data', function(d) {
		console.log("Data");
	
		onData(new Packet(d));
	});

	client.on('close', function() {
		console.log("Socket closed unexpectedly!");
	});

	client.on('error', function(e) {
		console.log("Error:");
		console.log(e);
	})
	
	client.resume();
});

function onData(dgram) {
	dgram.readClientHeader();
	
	console.log(dgram);
	console.log(dgram.length == dgram.buf.length-2);
	
	if(dgram.msgType == msgtypes.CLIENT_HELLO_RESP) {
		ws.sendUTF( JSON.stringify({
			type: "helloResp"
		}));
	} else if(dgram.msgType == msgtypes.CLIENT_EJECT) {
		ws.sendUTF( JSON.stringify({
			type: "eject",
			error_code: dgram.readUInt16(),
			reason: dgram.readString()
		}));
	} else if(dgram.msgType == msgtypes.CLIENT_ENTER_OBJECT_REQUIRED) {
		henterObject(dgram,false, false);
	} else if(dgram.msgType == msgtypes.CLIENT_ENTER_OBJECT_REQUIRED_OTHER) {
		henterObject(dgram,true, false);
	} else if(dgram.msgType == msgtypes.CLIENT_ENTER_OBJECT_REQUIRED_OWNER) {
		henterObject(dgram,false, true);
	} else if(dgram.msgType == msgtypes.CLIENT_ENTER_OBJECT_REQUIRED_OTHER_OWNER) {
		henterObject(dgram,true, true);
	} else if(dgram.msgType == msgtypes.CLIENT_OBJECT_SET_FIELD) {
		hsetFields(dgram,false);
	} else if(dgram.msgType == msgtypes.CLIENT_OBJECT_SET_FIELDS) {
		hsetFields(dgram,true);
	} else if(dgram.msgType == msgtypes.CLIENT_OBJECT_LEAVING) {
		ws.sendUTF( JSON.stringify({
			type: "leave",
			doID: dgram.readUInt32()
		}))
	} else if(dgram.msgType == msgtypes.CLIENT_OBJECT_LOCATION) {
		ws.sendUTF( JSON.stringify({
			type: "location",
			doID: dgram.readUInt32(),
			parentID: dgram.readUInt32(),
			zoneID: dgram.readUInt32()
		}))
	} else if(dgram.msgType == msgtypes.CLIENT_ADD_INTEREST) {
		haddInterest(dgram, false);
	} else if(dgram.msgType == msgtypes.CLIENT_ADD_INTEREST_MULTIPLE) {
		haddInterest(dgram, true);
	} else if(dgram.msgType == msgtypes.CLIENT_DONE_INTEREST_RESP) {
		ws.sendUTF( JSON.stringify({
			type: "interestDone",
			context: dgram.readUInt32(),
			interestID: dgram.readUInt16()
		}));
	} else {
		console.log("Unknown type "+dgram.msgtype);
	}
	
	console.log("EOD");
	
	if( dgram.offset  < dgram.buf.length-2) {
		console.log("More ");
		console.log(dgram);
		
		dgram.length = dgram.buf.readUInt16LE(dgram.offset);
		
		console.log(dgram.offset - 4);
		console.log(dgram.buf.length);
		
		dgram.buf = dgram.buf.slice(dgram.offset + 2);
		dgram.offset = 0;
		onData(dgram); // more to come!
	}
	
}



function henterObject(dgram, optionals, owner) {
    var do_id = dgram.readUInt32();
    var parent_id = dgram.readUInt32();
    var zone_id = dgram.readUInt32();
    var dclass_id = dgram.readUInt16();
    
    var obj = new DistributedClass(DCFile.DCFile[dclass_id][1],zone_id, do_id, this);
    obj.unpack(dgram, optionals, ["broadcast"]);
    
	console.log(DCFile.DCFile[dclass_id][1]+" "+(owner ? "mine" : "theirs"));
	
	ws.sendUTF(JSON.stringify({
		type: "enterObject",
		optionals: optionals,
		owner: owner, 
		doID: do_id,
		parentID: parent_id,
		zoneID: zone_id,
		dclass: DCFile.DCFile[dclass_id][1],
		properties: obj.properties
	}));
	
	console.log("Ping!");
}

function hsetFields(dgram, multiple) {
	var do_id = dgram.readUInt32();
	var num = 1;
	if(multiple) {
		num = dgram.readUInt16();
	}
	
	var fields = [];
	
	for(var i = 0; i < num; ++i) {
		fields.push(DistributedClass.prototype.unpackField(dgram, dgram.readUInt16(), true));
	}
	
	ws.sendUTF(JSON.stringify({
		type: "set",
		doID: do_id,
		fields: fields
	}));
}

function haddInterest(dgram, multiple) {
	var context = dgram.readUInt32();
	var interestID = dgram.readUInt16();
	var parentID = dgram.readUInt32();
	
	var zones = [];
	if(multiple) {
		var num = dgram.readUInt16();
		for(var i = 0; i < num; ++i) {
			zones.push(dgram.readUInt32());
		}
	} else {
		zones.push(dgram.readUInt32());
	}
	
	ws.sendUTF(JSON.stringify({
		type: "addInterest",
		context: context,
		interestID: interestID,
		parentID: parentID,
		zones: zones
	}));
	
	console.log("sent");
}

var ws = null;

var wss = new WebSocketServer({httpServer: require("http").createServer(function(){}).listen(8080)});
	
wss.on('request', function(w) {
	ws = w.accept(null, w.origin);
	
	console.log("Request accepted");
	
	ws.on('message', function(d) {
			console.log("MSG RECEIVE");
			
			var msg = JSON.parse(d.utf8Data.toString());
			
			dgram = new OutPacket();
			
			console.log(msg);
			
			if(msg.type == 'hello') {				
				dgram.writeClientHeader(msgtypes.CLIENT_HELLO);
				dgram.writeUInt32(msg.dcHash);
				dgram.writeString(msg.version);
			} else if(msg.type == 'disconnect') {
				dgram.writeClientHeader(msgtypes.CLIENT_DISCONNECT);
			} else if(msg.type == 'heartbeat') {
				dgram.writeClientHeader(msgtypes.CLIENT_HEARTBEAT);
			} else if(msg.type == 'set') {
				ssetField(msg);
			} else if(msg.type == 'location') {
				dgram.writeClientHeader(msgtypes.CLIENT_OBJECT_LOCATION);
				dgram.writeUInt32(msg.doID);
				dgram.writeUInt32(msg.parentID);
				dgram.writeUInt32(msg.zoneID);
			} else if(msg.type == 'addInterest') {
				saddInterest(msg);
			} else if(msg.type == 'removeInterest') {
				dgram.writeClientHeader(msgtypes.CLIENT_OBJECT_LOCATION);
				dgram.writeUInt32(msg.context);
				dgram.writeUInt16(msg.interestID);				
			} else {
				console.log(":/")
			}
			
			console.log(dgram);
			
			client.write(dgram.serialize());
	});
	
	ws.on('end', function() {
		var dc = new OutPacket()
		dc.writeClientHeader(msgtypes.CLIENT_DISCONNECT);
		client.write(dgram.serialize());
	});
});

function ssetField(msg) {
	dgram.writeClientHeader(msg.fields.length == 1 ? msgtypes.CLIENT_OBJECT_SET_FIELD
													: msgtypes.CLIENT_OBJECT_SET_FIELDS);
	dgram.writeUInt32(msg.doID);
	
	if(msg.fields.length > 1) dgram.writeUInt16(msg.fields.length);

	for(var i = 0; i < msg.fields.length; ++i) {
		var field_id = DCFile.reverseFieldLookup[msg.class+"::"+msg.fields[i].name];
		
		console.log(msg.class+"::"+msg.fields[i].name);
		console.log(field_id);
		
		dgram.writeUInt16(field_id);
		DistributedClass.prototype.packField(dgram, field_id, msg.fields[i].value, true);
	}
}

function saddInterest(msg) {
	dgram.writeClientHeader(msg.zones.length == 1 ? msgtypes.CLIENT_ADD_INTEREST
												  : msgtypes.CLIENT_ADD_INTEREST_MULTIPLE);
	dgram.writeUInt32(msg.context);
	dgram.writeUInt16(msg.interestID);
	dgram.writeUInt32(msg.parentID);
	
	if(msg.zones.length > 1) dgram.writeUInt16(msg.zones.length);
	
	for(var i = 0; i < msg.zones.length; ++i) {
		dgram.writeUInt32(msg.zones[i]);
	}
}