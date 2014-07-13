var bignum = require("bignum");

module.exports.zoneParentToChannel = function(zone, parent) {
 return bignum(parent).shiftLeft(32).or(zone);  
}