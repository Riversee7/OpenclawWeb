// tmp ssh script
const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('journalctl -n 50 -u pm2-river || pm2 logs --lines 50 || tail -n 50 ~/.pm2/logs/*.log', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.error('STDERR: ' + data);
    });
  });
}).connect({
  host: '192.168.178.99',
  port: 22,
  username: 'river',
  password: 'hamsat123'
});
