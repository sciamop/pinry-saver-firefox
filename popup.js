// Pinry Saver Firefox Addon - Popup Script

class PinryShare {
  constructor() {
    this.init();
  }

  async init() {
    console.log('Initializing PinrySaver...');
    await this.loadSettings();
    this.bindEvents();
    console.log('PinrySaver initialized - Ready for right-click image sharing');
  }

  async loadSettings() {
    const result = await browser.storage.sync.get(['pinryUrl', 'apiKey', 'defaultBoardId']);
    this.pinryUrl = result.pinryUrl || '';
    this.apiKey = result.apiKey || '';
    this.defaultBoardId = result.defaultBoardId || '';
    
    // Update settings form
    document.getElementById('pinryUrl').value = this.pinryUrl;
    document.getElementById('apiKey').value = this.apiKey;
    document.getElementById('defaultBoardId').value = this.defaultBoardId;
  }

  bindEvents() {
    // Save settings button
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });
  }

  async saveSettings() {
    const pinryUrl = document.getElementById('pinryUrl').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();
    const defaultBoardId = document.getElementById('defaultBoardId').value.trim();

    if (!pinryUrl || !apiKey) {
      this.updateStatus('Pinry URL and API key are required', 'error');
      return;
    }

    try {
      await browser.storage.sync.set({
        pinryUrl: pinryUrl,
        apiKey: apiKey,
        defaultBoardId: defaultBoardId
      });

      this.pinryUrl = pinryUrl;
      this.apiKey = apiKey;
      this.defaultBoardId = defaultBoardId;
      
      this.updateStatus('Settings saved!', 'success');
    } catch (error) {
      console.error('Error saving settings:', error);
      this.updateStatus('Error saving settings', 'error');
    }
  }

  updateStatus(message, type = '') {
    // Simple console logging since we removed the status display
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PinryShare();
});