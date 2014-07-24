var bignum = require('bignum'); // needed for accurate arithmetic

function Packet(buf){
    this.buf = buf;
    this.offset = 2;
    this.length = this.buf.readUInt16LE(0);
}

Packet.prototype.readUInt8 = function(){ this.offset += 1; if(this.offset-2>=this.length)return 0; return this.buf.readUInt8(this.offset-1); };
Packet.prototype.readUInt16 = function(bypassCheck){ this.offset += 2; if(this.offset-4>=this.length && !bypassCheck)return 0; return this.buf.readUInt16LE(this.offset-2); };
Packet.prototype.readUInt32 = function(){ this.offset += 4; if(this.offset-6>=this.length)return 0; return this.buf.readUInt32LE(this.offset-4); };
Packet.prototype.readUInt64 = function(){ this.offset += 8; if(this.offset-10>=this.length)return 0; return bignum(this.buf.readUInt32LE(this.offset-4)).shiftLeft(32).or(this.buf.readUInt32LE(this.offset-8)); };
Packet.prototype.readInt8 = function(){ this.offset += 1; if(this.offset-2>=this.length)return 0; return this.buf.readInt8(this.offset-1); };
Packet.prototype.readInt16 = function(){ this.offset += 2; if(this.offset-4>=this.length)return 0; return this.buf.readInt16LE(this.offset-2); };
Packet.prototype.readInt32 = function(){ this.offset += 4; if(this.offset-6>=this.length)return 0; return this.buf.readInt32LE(this.offset-4); };
Packet.prototype.readInt64 = function(){ this.offset += 8; console.log("int64 read not supported"); };
Packet.prototype.readBlob = function(l){ this.offset+=l; if(this.offset-10 >= this.length) return null; var b = new Buffer(l); this.buf.copy(b, 0, this.offset-l, this.offset);  return b};
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
OutPacket.prototype.writeUInt64 = function(b){ b = bignum(b);  this.writeUInt32(b.and(0xFFFFFFFF)); this.writeUInt32(b.shiftRight(32));  };
OutPacket.prototype.writeInt8 = function(b){ this.writeUInt8(b); }; // write sign is a semantic issue, actually
OutPacket.prototype.writeInt16 = function(b){ this.writeUInt16(b); };
OutPacket.prototype.writeInt32 = function(b){ this.writeUInt32(b); };
OutPacket.prototype.writeInt64 = function(b){ this.writeUInt64(b); };
OutPacket.prototype.writeBlob = function(b,l){ var i = 0; while(i < l){ this.buf.push(b[i].charCodeAt(0)); ++i; }; };
OutPacket.prototype.writeString = function(str){ this.writeUInt16(str.length); this.writeBlob(str,str.length);};

OutPacket.prototype.writeClientHeader = function(msgtype){ console.log(msgtype); this.writeUInt16(msgtype); };
OutPacket.prototype.writeMDHeader = function(recipients, msgtype, sender){
	if(!Array.isArray(recipients)) recipients = [recipients];
    
    console.log(recipients);
    
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
