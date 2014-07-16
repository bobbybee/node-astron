var serializeToken = require("./serializeToken");
var unserializeToken = require("./unserializeToken");

var DCFile = require("./DCFile");

var aiClasses = {};

function DistributedClass(class_t, zone, doID, ss){
    this.class_t = class_t;
    this.zone = zone;
    
    this.ss = ss;
    
    this.class = DCFile.DCFile[DCFile.classLookup[this.class_t]];
        
    this.requiredFields = [];
    this.fieldIndex = {};
    var i = 0;
    while(i < this.class[2].length){
        this.fieldIndex[this.class[2][i][1]] = i;
        
        if(this.class[2][i][2].indexOf('required') > -1){
             this.requiredFields.push(this.class[2][i]);
         }
         
         ++i;
     }
     
     this.doID = doID;
     
     //TODO: inheritance
    
    this.properties = {}; // properties inited by required..
}


DistributedClass.prototype.serialize = function(out, requiredMods){
    var i = 0;
    
    if(!requiredMods) requiredMods = [];
    
    contLoop: while(i < this.requiredFields.length){
        if(!this.properties[this.requiredFields[i][1]]){
            ++i;
            continue contLoop;
        }
        
        
        var f = 0;
        while(f < requiredMods.length){
          if(requiredMods[f] != 'ram' && this.requiredFields[i][2].indexOf(requiredMods[f]) == -1) {
                  ++i;
                  continue contLoop; // BYE
                  
          }
    
             ++f;
        }
        // TODO: required morphs?
        var j = 0;
        while(j < this.requiredFields[i][3].length){
            serializeToken(out, this.requiredFields[i][3][j], this.properties[this.requiredFields[i][1]][j]);
            ++j;
        }
        ++i;
    }
    var optionals = [];
    
    i = 0;
    skipOpt: while(i < this.class[2].length){
        if(this.class[2][i][2].indexOf("required") == -1 && this.class[2][i][2].indexOf("ram") > -1){
            if(this.properties[this.class[2][i][1]]){
                f = 0;
                while(f < requiredMods.length){
                  if(this.class[2][i][2].indexOf(requiredMods[f]) == -1) {
                      ++i;
                    continue skipOpt;
                  }
            
                 ++f;
                }
                
                optionals.push(i)
            }
        }
        ++i;
    }
        
    out.writeUInt16(optionals.length);
    
    i = 0;
    while(i < optionals.length){
        var field = this.class[2][optionals[i]][3]; 
        
        out.writeUInt16(DCFile.reverseFieldLookup[this.class_t+"::"+this.class[2][optionals[i]][1]]);        
                
        console.log(this.class[2][optionals[i]]+"("+this.properties[this.class[2][optionals[i]][1]]+")");
        
        j = 0;
        while(j < field.length){
            serializeToken(out, field[j], this.properties[this.class[2][optionals[i]][1]][j]);
            ++j;
        }
        
        ++i;
    }
    
};

DistributedClass.prototype.unpack = function(in_t, optionalsEnabled, requiredFields) {
    if(!requiredFields) requiredFields = [];
    var attrs = this.class[2];
    
    nextField: for(var r = 0; r < attrs.length; ++r) {
        if(attrs[r][2].indexOf('required') > -1) {
            for(var f = 0; f < requiredFields.length; ++f) {
                if(attrs[r][2].indexOf(requiredFields[f]) == -1) continue nextField;
            }
            
            var ps = [];
            
            for(var a = 0; a < attrs[r][3].length; ++a) {
                ps.push(unserializeToken(in_t, attrs[r][3][a]));
            }
            
            this.properties[attrs[r][1]] = ps;
        }
    }
    
    if(optionalsEnabled) {
        var numOptionals = in_t.readUInt16();
        
        for(var i = 0; i < numOptionals; ++i) {
           var field_id = in_t.readUInt16();
           
           this.unpackField(in_t, field_id);
        }
    }
}

DistributedClass.prototype.unpackField = function(in_t, field_id) {    
    var field = DCFile.fieldLookup[field_id];

    var ps = [];
    
    for(var a = 0; a < field[4].length; ++a) {
        ps.push(unserializeToken(in_t, field[4][a]));
    } 
    
    this.properties[field[2]] = ps;
    
    return {
        name: field[2],
        value: ps
    }
}

DistributedClass.prototype.pack = function(out_t, properties, requiredFields) {
    if(!requiredFields) requiredFields = [];
    var attrs = this.class[2];
    
    nextField: for(var r = 0; r < attrs.length; ++r) {
        if(attrs[r][2].indexOf('required') > -1) {
            for(var f = 0; f < requiredFields.length; ++f) {
                if(attrs[r][2].indexOf(requiredFields[f]) == -1) continue nextField;
            }
                        
            console.log(attrs[r]);            
                        
            for(var a = 0; a < attrs[r][3].length; ++a) {
                serializeToken(out_t, attrs[r][3][a], this.properties[attrs[r][1]] ? this.properties[attrs[r][1]][a]
                                                                                    : 0);
            }
        }
    }
    
    if(!properties) return;

    out_t.writeUInt16(properties.length);
        
    for(var i = 0; i < properties.length; ++i) {
        var field_id = DCFile.reverseFieldLookup(this.class_t+"::"+properties[i]);
        
        out_t.writeUInt16(field_id);
       this.packField(out_t, field_id, this.properties[properties[i]]);
    }
}

DistributedClass.prototype.packField = function(out_t, field_id, args) {
    var field = DCFile.fieldLookup[field_id];
        
    for(var a = 0; a < field[4].length; ++a) {
        serializeToken(out_t, field[4][a], args[a]);
    } 
    
    this.properties[field[2]] = args;
}

DistributedClass.prototype.callOfClass = function(class_n, fieldName, value, dgram) {
    if(aiClasses[class_n])
        if(aiClasses[class_n][fieldName])
            aiClasses[class_n][fieldName].apply({
                dclass: this,
                dgram: dgram
            }, value);
}

DistributedClass.prototype.call = function(fieldName, value, dgram) {
    this.callOfClass(this.class_t, fieldName, value, dgram); // TODO: inheritance
}

module.exports = DistributedClass;
module.exports.handleClassAI = function(class_n, ai) {
    aiClasses[class_n] = ai;
}