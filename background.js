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

async function extractEnhancedDescription(info, tab) {
  const parts = [];
  
  try {
    // Try to extract domain from page URL (robust handling)
    let domain = null;
    if (tab && tab.url) {
      try {
        const pageUrl = new URL(tab.url);
        domain = pageUrl.hostname;
      } catch (urlError) {
        console.log('Invalid page URL:', tab.url);
      }
    }
    
    // Try to get image metadata from the page (only if we have a valid tab)
    let imageMetadata = null;
    if (tab && tab.id && info.srcUrl) {
      try {
        imageMetadata = await browser.tabs.executeScript(tab.id, {
          code: `
            try {
              // Find the image element that was right-clicked
              const images = document.querySelectorAll('img');
              let targetImage = null;
              
              for (const img of images) {
                if (img.src === '${info.srcUrl}' || img.currentSrc === '${info.srcUrl}') {
                  targetImage = img;
                  break;
                }
              }
              
              // Extract alt and title attributes (handle null/undefined)
              let altText = '';
              let titleText = '';
              
              if (targetImage) {
                altText = targetImage.getAttribute('alt') || '';
                titleText = targetImage.getAttribute('title') || '';
              }
              
              // Return the metadata
              JSON.stringify({
                alt: altText,
                title: titleText,
                found: !!targetImage
              });
            } catch (e) {
              JSON.stringify({
                alt: '',
                title: '',
                found: false,
                error: e.message
              });
            }
          `
        });
      } catch (scriptError) {
        console.log('Could not execute script to extract image metadata:', scriptError);
      }
    }
    
    // Process image metadata if available
    if (imageMetadata && imageMetadata[0]) {
      try {
        const metadata = JSON.parse(imageMetadata[0]);
        
        // Add alt text if available and not empty
        if (metadata.alt && typeof metadata.alt === 'string' && metadata.alt.trim()) {
          parts.push(metadata.alt.trim());
        }
        
        // Add title text if available, different from alt, and not empty
        if (metadata.title && 
            typeof metadata.title === 'string' && 
            metadata.title.trim() && 
            metadata.title.trim() !== metadata.alt?.trim()) {
          parts.push(metadata.title.trim());
        }
      } catch (parseError) {
        console.log('Error parsing image metadata:', parseError);
      }
    }
    
    // Add domain if available
    if (domain) {
      parts.push(`Source: ${domain}`);
    }
    
    // Return description or fallback
    if (parts.length > 0) {
      return parts.join(' | ');
    } else {
      // Ultimate fallback - use image filename or generic text
      if (info.srcUrl) {
        try {
          const imageUrl = new URL(info.srcUrl);
          const filename = imageUrl.pathname.split('/').pop();
          if (filename && filename.includes('.')) {
            return `Image: ${filename}`;
          }
        } catch (e) {
          // URL parsing failed, use the last part of the path
          const pathParts = info.srcUrl.split('/');
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.includes('.')) {
            return `Image: ${lastPart}`;
          }
        }
      }
      return 'Saved image';
    }
    
  } catch (error) {
    console.error('Error extracting enhanced description:', error);
    // Return a basic fallback
    return 'Saved image';
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
        
        console.log('Saving image to Pinry:', imageUrl);
        
        // Extract enhanced description with image metadata and page domain
        const description = await extractEnhancedDescription(info, tab);
        
        const pinData = {
          url: imageUrl,
          description: description,
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