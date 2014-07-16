var common = require("./common");

var MessageDirector = require("./MessageDirector");
var StateServer = require("./StateServer");

var bignum = require("bignum");

var MD = new MessageDirector("127.0.0.1", 7199);
var SS = new StateServer(402000);

var msgtypes = require("./msgtypes");
var DistributedClass = require("./DistributedClass");

var OutPacket = require("./Packet").OutPacket;

var AIChannel = 300001;

var DOManager = require("./DOManager");
var ClientState = require("./ClientState");

var SPEED_MUL = 5;

var idCount = 1;
function allocID() {
    return AIChannel + (idCount++);
}

DistributedClass.handleClassAI("LoginManager", {
    login: function(username, password) {
        console.log("Login attempt with username: "+username+" password: "+password);
        
        if(username == "guest" && password == "guest") {
            var dg = new OutPacket();
            dg.writeMDHeader(this.dgram.sender, msgtypes.CLIENTAGENT_SET_STATE, this.dclass.doID);
            dg.writeUInt16(2);
            MD.write(dg);
            
            ClientState[this.dgram.sender] = {};
            
            this.dclass.mapRoot.sendUpdate(MD, this.dclass.doID, this.dclass.mapRoot.channel, "createAvatar", this.dgram.sender);
        } else {
            var dg = new OutPacket();
            dg.writeMDHeader(this.dgram.sender, msgtypes.CLIENTAGENT_EJECT, this.dclass.doID);
            dg.writeUInt16(122);
            dg.writeString("Bad credentials");
            MD.write(dg);
        }
    }
});

DistributedClass.handleClassAI("DistributedMaproot", {
    createAvatar: function(clientChannel) {
        console.log("Client "+clientChannel);
        
        var avatar = new StateServer(allocID(), "DistributedAvatar");
        MD.addChannel(avatar.channel, avatar);
        avatar.reflectCreate(0);
        SS.createObject(MD, AIChannel, avatar.do, this.dclass.doID, 0);
        
        ClientState[clientChannel].avatar = avatar;
        ClientState[clientChannel].move = setInterval(
            function() {
                console.log(ClientState);
                                
                var _heading = ClientState[clientChannel].heading;
                var _speed = ClientState[avatar.channel].speed;
                var curPos = avatar.do.properties["setXYZH"] ? avatar.do.properties["setXYZH"] : [0,0,0,-180]
                                
                curPos[3] += _heading * SPEED_MUL;
                
                console.log(curPos[3]);
                
                var angle = curPos[3] * 0.0174532925; // 1 degree in radians
                
                
                curPos[0] += Math.cos(angle) * SPEED_MUL * _speed;
                curPos[1] += Math.sin(angle) * SPEED_MUL * _speed;
                        
                avatar.sendUpdate(MD, 10000, clientChannel, "setXYZH", 
                    curPos[0], curPos[1], curPos[2], curPos[3]);
            
            }, 250);
                    
        
        var packet = new OutPacket();
        packet.writeMDHeader(clientChannel, msgtypes.CLIENTAGENT_ADD_INTEREST, this.dclass.doID);
        packet.writeUInt16(0);
        packet.writeUInt32(this.dclass.doID);
        packet.writeUInt32(0);
        MD.write(packet);
        
        var packet = new OutPacket();
        packet.writeMDHeader(avatar.channel, msgtypes.STATESERVER_OBJECT_SET_OWNER, this.dclass.doID);
        packet.writeUInt64(clientChannel);
        MD.write(packet);
        
        var packet = new OutPacket();
        packet.writeMDHeader(clientChannel, msgtypes.CLIENTAGENT_ADD_SESSION_OBJECT, this.dclass.doID);
        packet.writeUInt32(avatar.channel);
        MD.write(packet);
    },
    
    indicateIntent: function(heading, speed) {
        var speed_mul = 5;
        
        ClientState[this.dgram.sender].heading = heading;
        ClientState[this.dgram.sender].speed = speed;
    }    
});

MD.connect(function() {
    console.log("Connected!");
    MD.setName("test_md.js");
    MD.addChannel(402000, SS);
    
   // MD.addChannel( common.zoneParentToChannel(0, 10000) , SS);
    //SS.getZonesObjects(MD, 1234, 1337, 10000, 0);
    
    var LoginManager = new StateServer(1234, "LoginManager");
    MD.addChannel(LoginManager.channel, LoginManager);
    LoginManager.reflectCreate(-1);

    var MapRoot = new StateServer(10000, 'DistributedMaproot');
    MD.addChannel(MapRoot.channel, MapRoot);
    MapRoot.reflectCreate(-1);
    SS.createObject(MD, AIChannel, MapRoot.do, 0, 0);
    
    LoginManager.do.mapRoot = MapRoot;
    
    
    MD.addChannel(AIChannel, MapRoot);    
    var dg = new OutPacket();
    dg.writeMDHeader(MapRoot.channel, msgtypes.STATESERVER_OBJECT_SET_AI, AIChannel);
    dg.writeUInt64(AIChannel);
    MD.write(dg);
});