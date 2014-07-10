var MessageDirector = require("./MessageDirector");
var StateServer = require("./StateServer");

var MD = new MessageDirector("127.0.0.1", 7199);
MD.connect(function() {
    console.log("Connected!");
    MD.setName("test_md.js");
    MD.addChannel(402000, new StateServer(402000));
});