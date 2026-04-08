module.exports = {
  apps: [{
    name: 'hub',
    script: 'src/index.js',
    cwd: '/web/io011/hub',
    env: {
      PORT: 1569,
      NODE_ENV: 'production'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
  }]
};
