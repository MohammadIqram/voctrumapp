const { app } = require('electron');

// Enable auto-launch on app start
function enableAutoLaunch() {
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: false
  });
  console.log('Auto-launch is enabled');
};

// Export the functions
module.exports = {
  enableAutoLaunch,
};
