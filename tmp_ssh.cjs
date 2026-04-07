const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Client :: ready');
  conn.exec(`cd ~/.openclaw/workspace/OpenclawWeb && mv tools.json tools.json.bak 2>/dev/null; git pull; mv tools.json.bak tools.json 2>/dev/null; killall node; nohup npm run dev:all > full_server.log 2>&1 < /dev/null & sleep 2`, { pty: false }, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).connect({
  host: '192.168.178.99',
  port: 22,
  username: 'river',
  password: 'hamsat123'
});
