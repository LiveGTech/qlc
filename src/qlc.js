/*
    Quick Lookup Collections (QLC)

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const fs = require("fs");
const path = require("path");
const BSON = require("bson");

const FORMAT_VERSION = 0;
const HEADER_BUFFER = Buffer.from([0x51, 0x4C, 0x43, FORMAT_VERSION]); // Starts with magic `"QLC"`

function traverseFolder(pathBase, pathString = ".") {
    var files = [];
    var list = fs.readdirSync(path.join(pathBase, pathString));

    list.forEach(function(file) {
        var childPath = path.join(pathString, file);
        var stat = fs.statSync(path.join(pathBase, childPath));

        if (stat.isDirectory()) {
            files.push(...traverseFolder(pathBase, childPath));
        } else {
            files.push(childPath);
        }
    });

    return files;
}

exports.Collection = class {
    static loadFromBuffer(buffer) {
        var instance = new exports.BufferCollection(buffer);

        return instance.load().then(function() {
            return Promise.resolve(instance);
        });
    }

    static loadFromFile(pathString) {
        return new Promise(function(resolve, reject) {
            fs.open(pathString, "r", function(error, fd) {
                if (error) {
                    reject(error);

                    return;
                }

                var instance = new exports.FileCollection(fd);

                instance.load().then(function() {
                    resolve(instance);
                });
            })
        });

        return instance.load().then(function() {
            return Promise.resolve(instance);
        });
    }

    static loadFromFolder(pathString) {
        var files = traverseFolder(pathString);
        var data = {};

        files.forEach(function(filePath) {
            data[filePath] = fs.readFileSync(path.join(pathString, filePath));
        });

        var instance = new exports.ObjectCollection(data);

        return instance.load().then(function() {
            return Promise.resolve(instance);
        });
    }

    load() {
        return Promise.resolve();
    }

    getKeys() {
        return Promise.reject("Not implemented in base class");
    }

    getData(key) {
        return Promise.reject("Not implemented in base class");
    }

    encode() {
        var thisScope = this;
        var dataChunks = [];
        var index = {};
        var bytePosition = 0;
        var promiseChain = Promise.resolve();

        return this.getKeys().then(function(keys) {
            keys.forEach(function(key) {
                promiseChain = promiseChain.then(function() {
                    return thisScope.getData(key);
                }).then(function(data) {
                    dataChunks.push(data);

                    index[key] = {p: bytePosition, l: data.length};
                    bytePosition += data.length;
                });
            });

            return promiseChain;
        }).then(function() {
            dataChunks.unshift(HEADER_BUFFER, BSON.serialize(index));

            return Promise.resolve(Buffer.concat(dataChunks));
        });
    }

    saveToFile(pathString) {
        return this.encode().then(function(buffer) {
            return new Promise(function(resolve, reject) {
                fs.writeFile(pathString, buffer, function(error) {
                    if (error) {
                        reject(error);

                        return;
                    }

                    resolve();
                });
            });
        })
    }
};

exports.ObjectCollection = class extends exports.Collection {
    constructor(data = {}) {
        super();

        this.data = data;
    }

    getKeys() {
        return Promise.resolve(Object.keys(this.data));
    }

    getData(key) {
        if (!(key in this.data)) {
            return Promise.resolve(null);
        }

        return Promise.resolve(this.data[key]);
    }
};

exports.DecodedCollection = class extends exports.Collection {
    constructor() {
        super();

        this.index = null;
        this.offset = null;
    }

    readBytes(offset, length) {
        return Promise.reject("Not implemented in base class");
    }

    getKeys() {
        if (this.index == null) {
            return Promise.reject("Data not loaded yet");
        }

        return Promise.resolve(Object.keys(this.index));
    }

    getData(key) {
        if (!this.index[key]) {
            return Promise.resolve(null);
        }

        return this.readBytes(this.offset + this.index[key].p, this.index[key].l);
    }

    async load() {
        var header = await this.readBytes(0, HEADER_BUFFER.length);

        if (!header.equals(HEADER_BUFFER)) {
            throw new Error("Header magic does not match expected value for QLC");
        }

        var indexLength = (await this.readBytes(HEADER_BUFFER.length, 4)).readUInt32LE(0);

        this.index = BSON.deserialize(await this.readBytes(HEADER_BUFFER.length, indexLength));
        this.offset = HEADER_BUFFER.length + indexLength;
    }
};

exports.BufferCollection = class extends exports.DecodedCollection {
    constructor(buffer) {
        super();

        this.buffer = buffer;
    }

    readBytes(offset, length) {
        return Promise.resolve(this.buffer.slice(offset, offset + length));
    }
};

exports.FileCollection = class extends exports.DecodedCollection {
    constructor(fd) {
        super();

        this.fd = fd;
    }

    readBytes(offset, length) {
        var thisScope = this;

        return new Promise(function(resolve, reject) {
            var buffer = Buffer.alloc(length);

            fs.read(thisScope.fd, buffer, 0, length, offset, function(error) {
                if (error) {
                    rejcet(error);

                    return;
                }

                resolve(buffer);
            })
        });
    }
}