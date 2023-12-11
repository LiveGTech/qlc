#!/usr/bin/env node

/*
    Quick Lookup Collections (QLC)

    Copyright (C) LiveG. All Rights Reserved.

    https://liveg.tech
    Licensed by the LiveG Open-Source Licence, which can be found at LICENCE.md.
*/

const path = require("path");
const args = require("minimist")(process.argv.slice(2));
const qlc = require("./qlc");

const EXEC_NAME = path.basename(process.argv[1]);

const HELP = `\
Usage: ${EXEC_NAME} INPUT [OUTPUT]
Create and inspect QLC data using options for INPUT and OUTPUT.

Options for INPUT:
    --from-file <inpath>    Read as binary data from a QLC-formatted file.
    --from-folder <inpath>  Read the folder at <inpath> and convert the folder's
                            contents into a QLC.

Options for OUTPUT:
    -o <outpath>            Write the QLC into a file at <outpath>.
    --list-keys             List the keys present in the QLC.
    --has <key>             Check if the QLC has the specified <key>.
    --get <key>             Get the raw contents of the QLC data in <key>.
    --count                 Get the number of keys in the QLC.

With no option for OUTPUT specified, then the raw binary data for the QLC is
written to stdout.

Exit status:
    0   if OK or result is true; or
    1   if an error occurs or if the result is false.

Source code and bug reporting facilities available at:
<https://github.com/LiveGTech/qlc>\
`;

var collection = null;

async function main() {
    if (args["from-file"]) {
        collection = await qlc.Collection.loadFromFile(args["from-file"]);
    } else if (args["from-folder"]) {
        collection = await qlc.Collection.loadFromFolder(args["from-folder"]);
    }

    if (collection == null) {
        console.log(HELP);

        return;
    }

    if (args["o"]) {
        await collection.saveToFile(args["o"]);
    } else if (args["list-keys"]) {
        var keys = await collection.getKeys();

        console.log(keys.join("\n"));
    } else if (args["has"]) {
        var keys = await collection.getKeys();
        var exists = keys.includes(args["has"]);

        console.log(exists ? "true" : "false");

        process.exit(exists ? 0 : 1);
    } else if (args["get"]) {
        var data = await collection.getData(args["get"]);

        if (data == null) {
            process.stderr.write(`${EXEC_NAME}: key does not exist\n`);
            process.exit(1);

            return;
        }

        process.stdout.write(data);
    } else if (args["count"]) {
        var keys = await collection.getKeys();

        console.log(String(keys.length));
    } else {
        var buffer = await collection.encode();
    
        process.stdout.write(buffer);
    }
}

main();