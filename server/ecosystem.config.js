module.exports = {
  apps: [
    {
      name: 'pasabuy-backend',
      script: './src/index.js',
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
