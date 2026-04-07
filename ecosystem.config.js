module.exports = {
  apps: [{
    name: 'event-staff-app',
    script: 'npm start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:YOUR_PASSWORD_HERE@YOUR_RDS_ENDPOINT_HERE:5432/eventstaff_prod',
      DIRECT_URL: 'postgresql://postgres:YOUR_PASSWORD_HERE@YOUR_RDS_ENDPOINT_HERE:5432/eventstaff_prod',
      // Add other environment variables as needed
      NEXT_PUBLIC_APP_URL: 'https://your-domain.com',
      BETTER_AUTH_URL: 'https://your-domain.com',
      BETTER_AUTH_SECRET: 'change-this-to-a-secure-random-string-in-production-min-32-chars',
      JWT_SECRET: 'your-super-secret-jwt-key-change-this-in-production',
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};