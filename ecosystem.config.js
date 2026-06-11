module.exports = {
  apps: [
    {
      name: 'machail-mata-bot',
      script: 'src/app.js',
      instances: 1,           // Single instance required for Telegram Long Polling
      exec_mode: 'fork',      // Runs in fork mode (no cluster conflicts)
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '1G', // Safeguard: Auto-restart process if RAM usage leaks above 1GB
      autorestart: true,
      watch: false,
      merge_logs: true,
      error_file: './error.log',
      out_file: './combined.log'
    }
  ]
};
