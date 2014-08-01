var common = require("./common");

var OutPacket = require("./Packet").OutPacket;


var MessageDirector = require("./MessageDirector");
var MD = new MessageDirector("127.0.0.1", 7199);

MD.connect(function() {
	var packet = new OutPacket();
	packet.writeMDHeader(1, 9014);
	packet.writeArray([0x81,0xa1,0x61,0xa1,0x62]);
	MD.write(packet);
})

