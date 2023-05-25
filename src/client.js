const net = require('net');
const crypto = require('crypto');
const aes256 = require('aes256');
const readline = require('readline');
const {config} = require('./config.js');

const keys = crypto.createECDH('secp256k1');

const security = {
  public: '',
  private: '',
  setPublicKey: () => {
    security.public = keys.getPublicKey().toString('base64');
  },
  setPrivateKey: (public) => {
    security.private = keys.computeSecret(public, 'base64', 'hex');
  },
  encrypt: (package) => {
    package.value = aes256.encrypt(security.private, package.value);
  },
  dectypt: (package) => {
    package.value = aes256.decrypt(security.private, package.value);
  },
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.setPrompt('');
keys.generateKeys();
security.setPublicKey();

const socket = new net.Socket();

socket.connect(config.port, 'localhost', () => {
  socket.write(JSON.stringify({
    type: 'key',
    value: security.public,
  }));

  rl.prompt();
});

socket.on('data', (data) => {
  const package = JSON.parse(data.toString());

  if (package.type === 'welcome') {
    console.log('> Welcome,', package.from);
    return;
  }

  if (package.type === 'leave') {
    console.log('>', package.from, 'left');
    return;
  }

  if (package.type === 'key') {
    security.setPrivateKey(package.value);
    console.log('> Secure connection is established');
    return;
  }

  security.dectypt(package);

  console.log(`${package.from}:`, package.value);
});

rl.on('line', (input) => {
  if (!security.private) {
    console.log('> Wait for connection to be established');
    return;
  }

  const package = {
    type: 'message',
    value: input,
  };

  security.encrypt(package);

  socket.write(JSON.stringify(package));
});

socket.on('end', () => {
  rl.close();
});
