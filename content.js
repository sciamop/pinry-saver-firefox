// Pinry Saver Firefox Addon - Content Script

// This content script can be used for additional page interaction features
// Currently it's minimal but can be extended for features like:
// - Auto-detecting page metadata
// - Adding share buttons to pages
// - Extracting better descriptions from page content

console.log('Pinry Saver content script loaded');

// Listen for messages from popup or background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getPageMetadata':
      sendResponse(getPageMetadata());
      break;
    
    case 'extractDescription':
      sendResponse(extractDescription());
      break;
    
    default:
      console.log('Unknown content script action:', request.action);
  }
});

function getPageMetadata() {
  const metadata = {
    title: document.title,
    url: window.location.href,
    description: '',
    image: '',
    tags: []
  };

  // Try to get meta description
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metadata.description = metaDesc.getAttribute('content');
  }

  // Try to get Open Graph description
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc && !metadata.description) {
    metadata.description = ogDesc.getAttribute('content');
  }

  // Try to get Open Graph image
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) {
    metadata.image = ogImage.getAttribute('content');
  }

  // Try to extract tags from meta keywords
  const metaKeywords = document.querySelector('meta[name="keywords"]');
  if (metaKeywords) {
    const keywords = metaKeywords.getAttribute('content');
    if (keywords) {
      metadata.tags = keywords.split(',').map(tag => tag.trim()).filter(tag => tag);
    }
  }

  return metadata;
}

function extractDescription() {
  // Try to find a good description from page content
  const selectors = [
    'article p',
    '.content p',
    '.post-content p',
    '.entry-content p',
    'main p',
    'p'
  ];

  for (const selector of selectors) {
    const paragraphs = document.querySelectorAll(selector);
    for (const p of paragraphs) {
      const text = p.textContent.trim();
      if (text.length > 50 && text.length < 500) {
        return text;
      }
    }
  }

  return '';
}
