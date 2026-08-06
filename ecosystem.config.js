module.exports = {
  apps: [
    {
      name: "satyatech-api",
      script: "./index.js",
      cwd: "/var/www/satyatech/backend",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "200M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
