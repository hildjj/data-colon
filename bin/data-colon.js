#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const dataUri = require('strong-data-uri');
const {default: mime} = require('mime');
const commander = require('commander');
const {Buffer} = require('node:buffer');

// Examples:
// decode: data-colon data:foo
// encode: data-colon filename
// decode: data-colon < filename-starting-with-data:
// encode: data-colon < filename

const pkg = require('../package');
const {program} = commander;

program
  .version(pkg.version)
  .option('-o, --output <file>', 'Output file name [stdout]')
  .option('-m, --mediatype <type>', 'MIME media type for encoding')
  .arguments('[fileOrURI...]')
  .parse(process.argv);

const opts = program.opts();

const DATA = 'data:';
const DATA_REGEX = /^data:/;
const DATA_BUF = Buffer.from(DATA);

const OUTPUT = opts.output ?
  fs.createWriteStream(opts.output) :
  process.stdout;

let media = opts.mediatype;
if (program.args.length === 0) {
  program.args = ['-'];
}

function readStdin(_cb) {
  return new Promise((resolve, reject) => {
    const input = [];
    process.stdin.on('data', buf => input.push(buf));
    process.stdin.on('end', () => resolve(Buffer.concat(input)));
    process.stdin.on('error', reject);

    process.stdin.resume();
  });
}

function encode(buf) {
  // Encode only throws on bad input types, which can't happen here.
  OUTPUT.write(dataUri.encode(buf, media));
  OUTPUT.write('\n');
}

function decode(buf) {
  let dat = Buffer.isBuffer(buf) ? buf.toString('utf8') : buf;
  dat = dat.trim();
  return new Promise((_resolve, _reject) => {
    try {
      OUTPUT.write(dataUri.decode(dat));
    } catch (e) {
      console.error(e.message);
      process.exit(1);
    }
  });
}

function detect(buf) {
  const f = (
    (buf.length < 5) ||
    (!DATA_BUF.equals(buf.slice(0, DATA_BUF.length)))) ?
    encode :
    decode;
  f(buf);
}

async function main() {
  for (const arg of program.args) {
    if (arg.match(DATA_REGEX)) {
      await decode(arg);
    } else {
      let buf = null;
      if (arg === '-') {
        buf = await readStdin();
      } else {
        if (!media) {
          media = mime.getType(arg);
        }
        buf = await fs.promises.readFile(arg);
      }
      await detect(buf);
    }
  }
}

main().catch(er => {
  console.error(er.message);
  process.exit(1);
});
