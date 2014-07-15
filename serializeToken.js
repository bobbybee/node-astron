var DCFile = require("./DCFile");

function serializeToken(out, type, val){
    type = type.trim();
    
    if(type.split(" ").length == 2) type = type.split(" ")[0];
    
    if(type[type.length-1] == ']') { // arrays have there own little implementation
        // array type
        
        var dynArray = type[type.length-2] == '[';
        if(dynArray){ // extract type
            
            type = type.slice(0,-3);
            var len = val.length;
            out.writeUInt16(len);
            
        } else {
            var tparts = type.split(' ');
            len = tparts[1].slice(1, -1);
            if(len.indexOf("-") > -1){
                len = val.length;
                out.writeUInt16(len);
            }
            type = tparts[0];
        }
        
        for(var y=0; y < len; y++){
            serializeToken(out, type, val[y]);
        }
        return;
    }
    
    if(DCFile.typedefs[type]) type = DCFile.typedefs[type]; // resolve typedefs
    
   
    
    if((type.indexOf("int") > -1)  && !Array.isArray(val)){
        var range = type.split('(');
        type = range[0];
        var type_p = type.split("%");
        val *= type_p[0].split("/")[1] ? type_p[0].split("/")[1] : 1;
        if(type_p[1]) val *= type_p[1].split("/")[1] ? type_p[1].split("/")[1] : 1;  
        type = type_p[0];
        type = type.split('/')[0].split('%')[0];
    }
    
    
         if(type == 'string')   out.writeString(val);
    else if(type == 'blob')     out.writeBlob(val);
    
    else if(type == 'char')     out.writeUInt8(val.charCodeAt(0));
    
    else if(type == 'int8')    out.writeInt8(val);
    else if(type == 'int16')   out.writeInt16(val);
    else if(type == 'int32')   out.writeInt32(val);
    else if(type == 'int64')   out.writeInt64(val);
    else if(type == 'uint8')    out.writeUInt8(val);
    else if(type == 'uint16')   out.writeUInt16(val);
    else if(type == 'uint32')   out.writeUInt32(val);
    else if(type == 'uint64')   out.writeUInt64(val);
    
    else if(type == 'uint8array') out.writeUInt8Array(val);
    else if(type == 'uint16array') out.writeUInt16Array(val);
    else if(type == 'uint32array') out.writeUInt32Array(val);
    else if(type == 'int8array') out.writeInt8Array(val);
    else if(type == 'int16array') out.writeInt16Array(val);
    else if(type == 'int32array') out.writeInt32Array(val);
    
    else if(type == 'int16[2]') {
        serializeToken(out, "int16", val[0]);
        serializeToken(out, "int16", val[1]);
    }
    
    else if(type == 'uint32uint8array') out.writeUInt32UInt8Array(val);
    
    else if(DCFile.classLookup[type]) val.serialize(out); // serialize the other class instead ;)
    else if(DCFile.structLookup[type]) serializeStruct(out, type, val);
    
    else console.log("UNKOWN TYPE: "+type);
} 

function serializeStruct(out, type, val) {
    console.log("SERIALIZE STRUCT");
    console.log(type);
    console.log(val);
}

module.exports = serializeToken;