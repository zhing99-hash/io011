module.exports = {
  apps: [{
    name: 'user-frontend',
    script: 'node_modules/serve/build/main.js',
    args: 'dist -s -l 1556',
    cwd: '/web/io011/user-frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
  }]
};
