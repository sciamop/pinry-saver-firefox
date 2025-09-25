// Pinry Saver Firefox Addon - Background Script

// Function to show HTML toast overlay
async function showToast(message, type = 'info') {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    
    // Inject the toast into the current page
    await browser.tabs.executeScript(tab.id, {
      code: `
        // Remove any existing toast
        const existingToast = document.getElementById('pinry-toast');
        if (existingToast) {
          existingToast.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.id = 'pinry-toast';
        
        // Set background color based on type
        const bgColor = '${type}' === 'success' ? '#4CAF50' : '#f44336';
        
        toast.style.cssText = \`
          position: fixed;
          top: 20px;
          right: 20px;
          background: \${bgColor};
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          font-weight: 500;
          max-width: 300px;
          word-wrap: break-word;
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
        \`;
        toast.textContent = '${message}';
        
        // Add to page
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
          toast.style.opacity = '1';
          toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateX(100%)';
          setTimeout(() => {
            if (toast.parentNode) {
              toast.remove();
            }
          }, 300);
        }, 3000);
      `
    });
  } catch (error) {
    console.error('Error showing toast:', error);
  }
}

// Handle addon installation
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Pinry Saver addon installed');
    // Set default settings if needed
    browser.storage.sync.get(['pinryUrl', 'apiKey']).then((result) => {
      if (!result.pinryUrl) {
        browser.storage.sync.set({
          pinryUrl: '',
          apiKey: ''
        });
      }
    });
  }
});

// Handle messages from content scripts or popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getCurrentTab':
      getCurrentTab().then(sendResponse);
      return true; // Keep message channel open for async response
    
    case 'shareToPinry':
      shareToPinry(request.data).then(sendResponse);
      return true;
    
    default:
      console.log('Unknown action:', request.action);
  }
});

async function getCurrentTab() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return { success: true, tab: tabs[0] };
  } catch (error) {
    console.error('Error getting current tab:', error);
    return { success: false, error: error.message };
  }
}

async function shareToPinry(pinData) {
  try {
    const settings = await browser.storage.sync.get(['pinryUrl', 'apiKey']);
    
    if (!settings.pinryUrl || !settings.apiKey) {
      return { success: false, error: 'Pinry URL and API key must be configured' };
    }

    const apiUrl = `${settings.pinryUrl}/api/v2/pins/`;
    
    console.log('Sending to Pinry:', {
      url: apiUrl,
      data: pinData
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${settings.apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(pinData)
    });

    console.log('Pinry response:', {
      status: response.status,
      statusText: response.statusText
    });

    if (response.ok) {
      const result = await response.json();
      return { success: true, data: result };
    } else {
      const errorText = await response.text();
      console.log('Error response body:', errorText);
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: errorText
      };
    }
  } catch (error) {
    console.error('Error sharing to Pinry:', error);
    return { success: false, error: error.message };
  }
}

// Create context menu on addon installation
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: 'save-to-pinry',
    title: 'Save to Pinry',
    contexts: ['image'],  // Only show for images
    icons: {
      "16": "icons/pinry_saver_bitmap_icon_white.png",
      "32": "icons/pinry_saver_bitmap_icon_white.png"
    }
  });
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'save-to-pinry') {
    try {
      const settings = await browser.storage.sync.get(['pinryUrl', 'apiKey', 'defaultBoardId']);
      
      if (!settings.pinryUrl || !settings.apiKey) {
        await showToast('Please configure Pinry URL and API key in the addon settings first.', 'error');
        return;
      }

      // Right-clicked on an image
      if (info.srcUrl) {
        const imageUrl = info.srcUrl;
        const imageTitle = info.srcUrl.split('/').pop() || 'Image';
        
        console.log('Saving image to Pinry:', imageUrl);
        
        // Simple URL approach - this works for most images
        const pinData = {
          url: imageUrl,
          description: imageTitle,
          tags: []
        };

        // Add board ID if specified
        if (settings.defaultBoardId) {
          pinData.board = settings.defaultBoardId;
        }

        const result = await shareToPinry(pinData);
        
        if (result.success) {
          await showToast('Successfully saved image to Pinry!', 'success');
        } else {
          // Better error handling - show user-friendly messages
          let errorMessage = 'Failed to save image';
          
          if (result.details) {
            // Parse the error details for better user feedback
            try {
              const errorData = JSON.parse(result.details);
              if (errorData['url-or-image']) {
                errorMessage = 'Invalid image URL - try a different image';
              } else if (result.details.includes('NOT NULL constraint failed')) {
                errorMessage = 'Image processing failed - try a different image';
              } else if (result.details.includes('IntegrityError')) {
                errorMessage = 'Image format not supported - try a different image';
              }
            } catch (e) {
              // If we can't parse the error, use the basic message
              errorMessage = result.error || 'Unknown error occurred';
            }
          } else {
            errorMessage = result.error || 'Unknown error occurred';
          }
          
          await showToast(errorMessage, 'error');
        }
      } else {
        // Not an image - show message
        await showToast('Please right-click on an image to save it to Pinry.', 'error');
      }
    } catch (error) {
      console.error('Error in context menu:', error);
      await showToast('An error occurred while saving to Pinry.', 'error');
    }
  }
});