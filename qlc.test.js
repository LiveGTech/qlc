/*
    Quick Lookup Collections (QLC)

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const qlc = require("./qlc");

const TEST_DATA = {
    "first": Buffer.from([0x01, 0x02, 0x03]),
    "second": Buffer.from([0x11, 0x12, 0x13]),
    "third": Buffer.from([]),
    "fourth": Buffer.from([0x31]),
    "fifth": Buffer.from([0x41, 0x42, 0x43, 0x44])
};

var oc = new qlc.ObjectCollection(TEST_DATA);
var ocBuffer;

var bc;

oc.load().then(function() {
    return oc.encode();
}).then(function(buffer) {
    ocBuffer = buffer;

    console.log("OC buffer:", ocBuffer);

    bc = new qlc.BufferCollection(buffer);

    return bc.load();
}).then(function() {
    return bc.getData("fifth");
}).then(function(fifthData) {
    console.log("Decoded data:", fifthData);
    console.assert(TEST_DATA["fifth"].equals(fifthData));

    return bc.encode();
}).then(function(bcBuffer) {
    console.log("BC buffer:", bcBuffer);
    console.assert(ocBuffer.equals(bcBuffer));
});