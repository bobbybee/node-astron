var DCFile = require("./DCFile");

function unserializeToken(in_p, type){
    type = type.trim();
    
    if(type.split(" ").length == 2) type = type.split(" ")[0];
    
    if(type[type.length-1] == ']') { // arrays have there own little implementation
        // array type
        var dynArray = type[type.length-2] == '[';
        if(dynArray){ // extract type
            type = type.slice(0,-3);
            var len = in_p.readUInt16();
        } else {
            var tparts = type.split(' ');
             len = tparts[1].slice(1, -1);
             if(len.indexOf('-') > -1){
                 len = in_p.readUInt16(); // it's range checking failure :p
             }
            type = tparts[0];
        }
        
        var arr = [];
        
        for(var y=0; y < len; y++){
            arr.push(unserializeToken(in_p, type));
        }
        
        if(type.slice(0, 4) == 'char'){
            // string in disguise
            return arr.join("");
        }
        return arr;
    }
    
    if(DCFile.typedefs[type]) type = DCFile.typedefs[type]; // resolve typedefs
    
    var range = type.split('(');
    type = range[0];
   
    if((type.indexOf("int") > -1)){
        var type_p = type.split("%");
        type = type_p[0];
        type = type.split('/')[0].split('%')[0];
    }
    
    var t = null;
    
    type = type.trim();
        
         if(type == 'string')   return in_p.readString();
    else if(type == 'blob')     return in_p.readBlob();
    
    else if(type == 'char')     return String.fromCharCode(in_p.readUInt8());
    
    else if(type == 'int8')    var t = in_p.readInt8();
    else if(type == 'int16')   var t = in_p.readInt16();
    else if(type == 'int32')   var t = in_p.readInt32();
    else if(type == 'int64 ')   var t = in_p.readInt64();
    else if(type == 'uint8')    var t = in_p.readUInt8();
    else if(type == 'uint16')   var t = in_p.readUInt16();
    else if(type == 'uint32')   var t = in_p.readUInt32();
    else if(type == 'uint64')   var t = in_p.readUInt64();
    
    else if(type == 'uint8array') return in_p.readUInt8Array();
    else if(type == 'uint16array') return in_p.readUInt16Array();
    else if(type == 'uint32array') return in_p.readUInt32Array();
    else if(type == 'int8array') return in_p.readInt8Array();
    else if(type == 'int16array') return in_p.readInt16Array();
    else if(type == 'int32array') return in_p.readInt32Array();
        
    else if(type == 'uint32uint8array') return in_p.readUInt32UInt8Array();
    
   // else if(DCFile.classLookup[type]) val.serialize(out); // serialize the other class instead ;)
    else if(DCFile.structLookup[type]) return unserializeStruct(in_p, type);
    
    else console.log("UNKOWN TYPE: "+type);
    
    if((type.indexOf("int") > -1)){
        t /= type_p[0].split("/")[1] ? type_p[0].split("/")[1] : 1;
        if(type_p[1]) t /= type_p[1].split("/")[1] ? type_p[1].split("/")[1] : 1;  
    }
    
    return t;
    
}

function unserializeStruct(in_p, type) {
    console.log("DESERIALIZE STRUCT");
    console.log(type);
}

module.exports = unserializeToken;