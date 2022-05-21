const { exec } = require('child_process');

exec(`rm -rf node_modules`, { cwd: process.cwd() }, async (err, stdout) => {
  if (err) return console.log(err);
  console.log('remove node_modules success');
});