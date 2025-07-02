/* eslint-disable no-console */
'use strict';

const test = require('ava');
const {spawn} = require('node:child_process');
const path = require('node:path');
const {readFile, writeFile, mkdtemp, rm} = require('node:fs').promises;
const os = require('node:os');
const {Buffer} = require('node:buffer');

const pkg = require('../package.json');

async function withTempDir(f) {
  const dir = await mkdtemp(`${path.join(os.tmpdir(), pkg.name)}-`);
  try {
    await f(dir);
  } finally {
    if (parseFloat(process.version.slice(1)) >= 12.10) {
      // If you use a more-modern node, I won't leave files in /tmp.
      // win-win.
      await rm(dir, {recursive: true});
    } else {
      console.log(
        `Clean up "${dir}" manually or upgrade node to 12.10 or higher.`
      );
    }
  }
}

function exec(bin, opts = {}) {
  opts = {
    args: [],
    encoding: 'utf8',
    env: {},
    ...opts,
  };
  return new Promise((resolve, reject) => {
    bin = path.join(__dirname, '..', 'bin', `${bin}.js`);
    const env = {
      ...process.env,
      ...opts.env,
    };
    if (!Array.isArray(opts.args)) {
      throw new Error(`Not array: ${opts.args}`);
    }
    opts.args.unshift(...process.execArgv, bin);
    const c = spawn(process.execPath, opts.args, {
      stdio: 'pipe',
      env,
    });
    c.on('error', reject);
    const bufs = [];
    c.stdout.on('data', b => bufs.push(b));
    c.stderr.on('data', b => bufs.push(b));
    c.on('close', code => {
      const buf = Buffer.concat(bufs);
      const str = buf.toString(opts.encoding);
      if (code === 0) {
        resolve(str);
      } else {
        const err = new Error(`process fail, code ${code}`);
        err.buf = buf;
        err.str = str;
        reject(err);
      }
    });
    c.on('exit', (code, signal) => {
      const problem = code || signal;
      if (problem) {
        reject(new Error(`Invalid exit: ${problem} from ${process.execPath} ${opts.args.join(' ')}`));
      }
    });
    if (opts.stdin != null) {
      c.stdin.write(opts.stdin);
    }
    c.stdin.end();
  });
}

test('help', async t => {
  const txt = await exec('data-colon', {
    args: ['-h'],
  });
  t.is(txt, `\
Usage: data-colon [options] [fileOrURI...]

Options:
  -V, --version           output the version number
  -o, --output <file>     Output file name [stdout]
  -m, --mediatype <type>  MIME media type for encoding
  -h, --help              display help for command\n`);
});

test('version', async t => {
  const txt = await exec('data-colon', {
    args: ['-V'],
  });
  t.is(txt, `${pkg.version}\n`);
});

test('decode', async t => {
  let txt = await exec('data-colon', {
    args: ['data:text/plain;base64,aGVsbG8gd29ybGQ='],
  });
  t.is(txt, 'hello world');
  txt = await exec('data-colon', {
    stdin: 'data:text/plain;base64,aGVsbG8gd29ybGQ=',
  });
  t.is(txt, 'hello world');

  await t.throwsAsync(async() => {
    await exec('data-colon', {
      args: ['data:text/plain,hello\nworld'],
    });
  });
});

test('encode', async t => {
  const txt = await exec('data-colon', {
    args: ['-m', 'text/plain'],
    stdin: 'hello world',
  });
  t.is(txt, 'data:text/plain;base64,aGVsbG8gd29ybGQ=\n');
});

test('round trip', async t => {
  await withTempDir(async dir => {
    const foo = path.join(dir, 'foo.json');
    const bar = path.join(dir, 'bar.json');
    await writeFile(foo, JSON.stringify({
      foo: 1,
      bar: [true, null],
    }, null, 2));
    let txt = await exec('data-colon', {
      args: [foo],
    });
    t.is(
      txt,
      'data:application/json;base64,' +
      'ewogICJmb28iOiAxLAogICJiYXIiOiBbCiAgICB0cnVlLAogICAgbnVsbAogIF0KfQ==\n'
    );
    txt = await exec('data-colon', {
      args: [foo, '-m', 'text/plain'],
    });
    t.is(
      txt,
      'data:text/plain;base64,' +
      'ewogICJmb28iOiAxLAogICJiYXIiOiBbCiAgICB0cnVlLAogICAgbnVsbAogIF0KfQ==\n'
    );
    await t.throwsAsync(async() => {
      await exec('data-colon', {
        args: [`${foo}-DOES_NOT_EXIST`],
      });
    });
    await exec('data-colon', {
      args: [foo, '-o', bar],
    });
    t.is(
      await readFile(bar, 'utf8'),
      'data:application/json;base64,' +
      'ewogICJmb28iOiAxLAogICJiYXIiOiBbCiAgICB0cnVlLAogICAgbnVsbAogIF0KfQ==\n'
    );
    await exec('data-colon', {
      args: [bar, '-o', foo],
    });
    t.deepEqual(JSON.parse(await readFile(foo, 'utf8')), {
      foo: 1,
      bar: [true, null],
    });
    await writeFile(foo, '{}');
    t.is(await exec('data-colon', {
      args: [foo],
    }), 'data:application/json;base64,e30=\n');
  });
});
