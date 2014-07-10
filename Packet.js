var Int64 = require('node-int64'); // needed for accurate arithmetic

function Packet(buf){
    this.buf = buf;
    this.offset = 0;
    
    this.length = this.readUInt16();
}

Packet.prototype.readUInt8 = function(){ this.offset += 1; return this.buf.readUInt8(this.offset-1); };
Packet.prototype.readUInt16 = function(){ this.offset += 2; return this.buf.readUInt16LE(this.offset-2); };
Packet.prototype.readUInt32 = function(){ this.offset += 4; return this.buf.readUInt32LE(this.offset-4); };
Packet.prototype.readUInt64 = function(){ var bigint = new Int64(0); bigint |= this.readUInt32(); bigint |= (this.readUInt32()) << 32; return bigint };
Packet.prototype.readBlob = function(l){ var b = new Buffer(l); this.buf.copy(b, 0, this.offset, this.offset+l); this.offset+=l; return b};
Packet.prototype.readString = function(){ return this.readBlob(this.readUInt16()).toString(); }

Packet.prototype.readClientHeader = function(){ this.msgType = this.readUInt16(); };
Packet.prototype.readMDHeader = function(){ 
	this.recipient_count = this.readUInt8();
	this.recipients = [];
	
	var i = this.recipient_count;
	while(i){
		this.recipients.push(this.readUInt64());	
		--i;
	}
	
	this.sender = this.readUInt64();
	this.msgtype = this.readUInt16();
};

function OutPacket(){
    this.buf = [];
}
OutPacket.prototype.writeUInt8 = function(b){ this.buf.push(b & 0xFF); };
OutPacket.prototype.writeUInt16 = function(b){ this.writeUInt8(b & 0xFF); this.writeUInt8((b >> 8) & 0xFF); };
OutPacket.prototype.writeUInt32 = function(b){ this.writeUInt16(b & 0xFFFF); this.writeUInt16((b >> 16) & 0xFFFF); };
OutPacket.prototype.writeUInt64 = function(b){ /*var bigInt = new Int64(b); this.writeUInt32(bigInt & 0x00000000FFFFFFFF); this.writeUInt32(bigInt & 0xFFFFFFFF00000000);*/ this.writeUInt32(b); this.writeUInt32(0); /* todo: proper 64-bit arithmetic  */};
OutPacket.prototype.writeBlob = function(b,l){ var i = 0; while(i < l){ this.buf.push(b[i].charCodeAt(0)); ++i; }; };
OutPacket.prototype.writeString = function(str){ this.writeUInt16(str.length); this.writeBlob(str,str.length);};

OutPacket.prototype.writeClientHeader = function(msgtype){ this.writeUInt16(msgtype); };
OutPacket.prototype.writeMDHeader = function(recipients, msgtype, sender){
	this.writeUInt8(recipients.length);
	var i = 0;
	while(i < recipients.length){
		this.writeUInt64(recipients[i++]);
	}
	if(sender) this.writeUInt64(sender);
	this.writeUInt16(msgtype);
};

OutPacket.prototype.serialize = function(){ var l = this.buf.length; return new Buffer([l & 0xFF, (l >> 8) & 0xFF].concat(this.buf));  };

module.exports.Packet = Packet;
module.exports.OutPacket = OutPacket;
