module.exports = {
  apps: [{
    name: "hub-admin",
    script: "npx",
    args: "serve /web/io011/hub-admin -l 1568 -s",
    interpreter: "none",
    cwd: "/web/io011/hub-admin"
  }]
};
