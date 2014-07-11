var MessageDirector = require("./MessageDirector");
var StateServer = require("./StateServer");

var bignum = require("bignum");

var MD = new MessageDirector("127.0.0.1", 7199);
var SS = new StateServer(402000);

MD.connect(function() {
    console.log("Connected!");
    MD.setName("test_md.js");
    MD.addChannel(402000, SS);
    
    MD.addChannel( (bignum(10000).shiftLeft(32).or(0)) , SS);
    SS.getZonesObjects(MD, 1234, 1337, 10000, 0);
    
});