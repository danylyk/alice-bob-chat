const net = require('net');
const {config} = require('./config.js');

const clients = {
  sockets: {},
  keys: {},
  add: (socket) => {
    if (!clients.sockets.alice) {
      clients.sockets.alice = socket;
      return 'Alice';
    }

    clients.sockets.bob = socket;
    return 'Bob';
  },
  key: (socket, key) => {
    if (socket === clients.sockets.alice) {
      clients.keys.alice = key;
      return;
    }

    clients.keys.bob = key;
  },
  remove: (socket) => {
    if (socket === clients.sockets.alice) {
      delete clients.sockets.alice;
      delete clients.keys.alice;
      return;
    }

    delete clients.sockets.bob;
    delete clients.keys.bob;
  },
};

const service = {
  connect: () => {
    const alice = {
      socket: clients.sockets.alice,
      key: clients.keys.alice,
    };

    const bob = {
      socket: clients.sockets.bob,
      key: clients.keys.bob,
    };
    
    setTimeout(() => {
      alice.socket.write(JSON.stringify({
        type: 'key',
        value: bob.key,
      }));
  
      bob.socket.write(JSON.stringify({
        type: 'key',
        value: alice.key,
      }));
    });
  },
  share: (socket, message) => {
    Object.values(clients.sockets).forEach((client) => {
      if (client !== socket) {
        client.write(JSON.stringify(message));
      }
    });
  },
}

const server = net.createServer((socket) => {
  if (clients.sockets.length >= 2) {
    socket.write('No free space!');
    socket.end();

    return;
  }

  const name = clients.add(socket);

  socket.write(JSON.stringify({
    type: 'welcome',
    from: name,
  }));

  socket.on('data', (data) => {
    const package = JSON.parse(data.toString());

    console.log(`${name}:`, package)

    if (package.type === 'key') {
      clients.key(socket, package.value);

      if (clients.keys.alice && clients.keys.bob && clients.sockets.alice && clients.sockets.bob) {
        service.connect();
      }

      return;
    }

    service.share(socket, {
      type: 'message',
      from: name,
      value: package.value,
    })
  });

  socket.on('end', () => {
    clients.remove(socket);
    service.share(socket, {
      type: 'leave',
      from: name,
    });
  });
});

server.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
