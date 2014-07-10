var MessageDirector = require("./MessageDirector");

var MD = new MessageDirector("127.0.0.1", 7199);
MD.connect(function() {
    console.log("Connected!");
    MD.setName("test_md.js");
    MD.addChannel(402000);
});