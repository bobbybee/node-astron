var MessageDirector = require("./MessageDirector");

var MD = new MessageDirector("127.0.0.1", 6660);
MD.connect(function() {
    console.log("Connected!");
});