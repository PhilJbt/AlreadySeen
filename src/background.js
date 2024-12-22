/**
* Detect the extension installation, extension update, or browser extension
*/
chrome.runtime.onInstalled.addListener(async (details) => {
	// Ask why the user decided to uninstall AS
	if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.setUninstallURL('mailto:philjbt@ik.me');
  }
	
	// Refresh tabs to add (and avoid errors), refresh (when updating) or remove (when uninstalling) AS	
	chrome.tabs.query({}, function (tabs) {
		for (let tab of tabs) {
			chrome.tabs.reload(tab.id);
		}
	});
});

/**
* Detect changes to tab URLs
*/
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === 'complete') {
		chrome.storage.sync.get(['linkUrls', 'imageUrls'], (result) => {
			const currentUrl = tab.pendingUrl || tab.url;

			// If the current tab URL includes a monitored domain
			if ((result.linkUrls && result.linkUrls.includes(currentUrl)) || 
					(result.imageUrls && result.imageUrls.includes(currentUrl))) {
				// Inject content.js to the tab
				chrome.tabs.get(tabId, function(tabId) {
					if (!chrome.runtime.lastError) {
						chrome.scripting.executeScript({
							target: { tabId },
							files: ['content.js']
						});
					}
				});
			}
		});
	}
});


/**
* Detect the click on AS's icon
*/
chrome.action.onClicked.addListener(async (tab) => {
	// Get the active tab's URL
	const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });

	if (activeTab.length > 0) {
		const tabUrl = activeTab[0].url;

		// Store the URL in chrome.storage
		chrome.storage.sync.set({ lastActiveTabUrl: tabUrl }, () => {
			// Open the options page
			chrome.runtime.openOptionsPage();
		});
	}
});


/**
* Message pump processing
*/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// Options page asks to delete an IndexedDb
  if (message.action === 'deleteDB') {
		// Get the scheme
		let url = message.nfo.url.match(/(https?:(\\)?\/(\\)?\/)/gi);
		// Add the scheme to the domain name
		url += message.nfo.dom;
		
		// Create a new tab with this domain name
		chrome.tabs.create({url: url}, (tab) => {
			// Wait for the tab to load before injecting the script
			chrome.tabs.get(tab.id, function() {
				if (!chrome.runtime.lastError) {
					chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
						if (tabId === tab.id && info.status === 'complete') {
							// Remove the listener
							chrome.tabs.onUpdated.removeListener(listener);
							// Inject the script erasing the website IndexedDb
							injectEraseIndexedDB(tab.id, message);
						}
					});
				}
			});
		});

		// Answer options page it's done, even if it not
		// Otherwise an offline or broken website would stop the entire removal process
    sendResponse({status: 'deletion-done'});
  }
	// Content.js has been injected and the tab URL is stored as monitored
	else if (message.action === 'setBadge') {
		chrome.tabs.get(sender.tab.id, function() {
				if (!chrome.runtime.lastError) {
					// Add the 'ON' badge on the AS icon
					if (message.show === true) {
						chrome.action.setBadgeBackgroundColor({
							color: '#4800ff',
							tabId: sender.tab.id
						});
						chrome.action.setBadgeTextColor({
							color: '#715fa1',
							tabId: sender.tab.id
						});
						chrome.action.setBadgeText({
							text: 'ON', //'\u2b50',
							tabId: sender.tab.id
						});
					}
					else if (message.show === false) {
						chrome.action.setBadgeBackgroundColor({
							color: '#000',
							tabId: sender.tab.id
						});
						chrome.action.setBadgeTextColor({
							color: '#000',
							tabId: sender.tab.id
						});
						chrome.action.setBadgeText({
							text: '',
							tabId: sender.tab.id
						});
					}
				}
			});
	}
	/*
	else if (message.action === 'setIcon') {
		chrome.action.setIcon({
			path: message.color ? 'img/icn/icn128_color.png' : 'img/icn/icn128_grey.png',
			tabId: sender.tab.id
		});
	}
	*/
});

/**
* Inject the eraseIndexedDB() script into the target tab
* @param {number} _tabId - ID of the target tab
* @param {object dict} _nfo - Informations as the url, the domain, if images and/or links are monitored
*/
function injectEraseIndexedDB(_tabId, _mess) {
	if (_mess.nfo
		&& _mess.nfo.dbid !== undefined) {
		// Inject the IndexedDb removal script
		chrome.tabs.get(_tabId, function() {
			if (!chrome.runtime.lastError) {
				chrome.scripting.executeScript({
					target: {tabId: _tabId},
					func : eraseIndexedDB,
					args: [_mess.nfo.dbid],
					injectImmediately: true
				}, () => {});
			}
		});
	}
}

/**
* Remove a IndexedDb website
* @param {number} _dbid - ID of the IndexedDb (is hash of the monitored url, even if regex)
*/
function eraseIndexedDB(_dbid) {
	// Since the 'injectImmediately' param is provided during the script injection,
	// this function will run before the content.js is fired.
	// Those two lines disable the content.js running.
	window['asleInit'] = true;
	window['asleProcess'] = true;
	
  let request = indexedDB.deleteDatabase(`alse_${_dbid}`);

	request.onsuccess = () => {
		alert(chrome.i18n.getMessage('notif_err_dbRemove_succ'));
		window.close();
	};

	request.onerror = (event) => {
		alert(chrome.i18n.getMessage('notif_err_dbRemove_fail'), event.target.error);
	};
}