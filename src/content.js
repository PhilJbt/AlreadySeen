/**
* Entry point
*/
if (document.readyState === "complete" || document.readyState === "interactive") {
	onDomLoaded();
} else {
	window.addEventListener("DOMContentLoaded", onDomLoaded);
}

/**
* Declare functions and run initializing functions
* @return {void}
*/
async function onDomLoaded() {
	// Initialization has already been performed, exit
	if (window['asleInit'] === true)
		return;
	
	// Global variables declaration
	window['asleInit']  = true;
	window['asleProcess'] = false;
	window['aslePlanned'] = null;
	window['asleTimestamp'] = null;
	window['asleLastRun'] = null;

	// Run initializing functions
	appendCss();
	observerInit();
	checkDomain();
	
	/**
	* Check if the current domain is monitored,
	* executes the element highlighting routine and colors the extension icon accordingly
	* @return {void}
	*/
	function checkDomain() {
		// Abort script execution if previous call has not yet been completed
		if (window['asleProcess'] !== true)
			window['asleProcess'] = true;
		else
			return;
		
		// Store the timestamp of the last run
		window['asleLastRun'] = new Date().getTime();

		// Retrieve the current tab url
		const href = window.location.href;
		
		// If the URL is a website (e.g. not chrome://extensions/, etc)
		if (/https?:\/\/?/ig.test(href)) {
			// Retrieve monitored URLs stored
			chrome.storage.sync.get(['urls'], (result) => {
				// Remove everything but the domain from the URL (i.e. scheme, port, path, parameters, anchor)
				const urlNoProtocols = getDomainOnly(href || '');
				// Remove sub-domain from the URL
				const urlDomOnly = trimSubdomain(urlNoProtocols || '', false);
				
				// The list of URLs is not empty
				if (result.urls) {
					// Check if the root domain is strictly monitored
					let domFound = result.urls[urlDomOnly] || null;
					
					// The root domain is not strictly monitored
					if (!domFound) {
						// Check if the root domain match with a regex stored root domain
						for (const [k, v] of Object.entries(result.urls)) {
							// Convert the stored domain to a regex
							let rgx;
							try {
								rgx = (new RegExp(k))
							}
							catch {
								break;
							}
							
							// Does the main domain stored (under a regex form) matches the current domain
							if (rgx.test(urlDomOnly)) {
								domFound = v;
								break;
							}
						}
					}
					
					// The root domain is monitored (strictly or with regex)
					if (domFound) {
						// This specific exact URL is monitored
						if (domFound[href] !== undefined
						&& domFound[href]?.rgx === 0) {
							// Set the 'ON' text over the exension badge
							setBadge(true);
							// Run the processing of images/links in this page
							highlightWebPage(href, domFound[href]);
							// Make it possible to restart the process
							window['asleProcess'] = false;
							return;
						}
						// The domain is monitored, but no exact URL matches
						else {
							for (let key in domFound) {
								if (domFound[key].rgx === 1
								&& new RegExp(key).test(href)) {
									// Set the 'ON' text over the exension badge
									setBadge(true);
									// Run the processing of images/links in this page
									highlightWebPage(key, domFound[key]);
									// Make it possible to restart the process
									window['asleProcess'] = false;
									return;
								}
							}
						}
					}
					
					// This domain has some URLs monitored (strictly or through regex),
					// but the current tab URL is not (neither strictly nor through regex).
					// In case this tab already has a badget set, hide it.
					setBadge(false);
				}
				// The domain is not monitored
				// In case this tab already has a badget set, hide it
				else
					setBadge(false);
			});
		}
		// The tab's URL is not that of a website
		// In case this tab already has a badget set, hide it
		else
			setBadge(false);
		
		// The URL is not monitored
		// Make it possible to restart the process
		window['asleProcess'] = false;
	}
	
	/**
	* Append the red border pulsing animation to the DOM
	*/
	function appendCss() {
		const style = document.createElement('style');
		
		style.textContent = `
			*[ast_pulsing="true"] {
				animation: pulseBorder 2s ease-in-out infinite;
			}
			@keyframes pulseBorder {
				0% {
					box-sizing: border-box;
					outline: 8px solid #ff000000;
					outline-offset: -30px;
				}
				50% {
					box-sizing: border-box;
					outline: 8px solid #ff0000ff;
					outline-offset: -8px;
				}
				100% {
					box-sizing: border-box;
					outline: 0px solid #ff000000;
					outline-offset: 0px;
				}
			}
		`;
		
		document.head.append(style);
	}
	
	/**
	* Run now or schedules the highlighting of page images/links depending on the last script run,
	* this allow to wait that the DOM is fully loaded, especially in case of lazy loaded images.
	* @param {number} _time - The number of seconds of delay
	*/
	function planRunning(_time) {
		// if last < delai
		if ((new Date().getTime()) < window['asleLastRun'] + 1500) {
			// clearTimeout
			clearTimeout(window['aslePlanned']);
			// settimeout
			window['aslePlanned'] = setTimeout(() => {
				checkDomain();
			}, _time);
		}
		// si le timestamp > délai,
		else {
			// clearTimeout
			clearTimeout(window['aslePlanned']);
			// lancer
			checkDomain();
		}
	}
	
	/**
	* Registers a callback to an observer in case the DOM changes
	*/
	function observerInit() {
		MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

		const observer = new MutationObserver(function(mutations, observer) {
			for (const mutation of mutations) {
				// If the DOM has had a link or image element added or modifier
				let bPlan = false;
				switch(mutation.type) {
					case 'childList':
						if (mutation.addedNodes.length > 0) {
							// Add the actions to be done here if a changes on DOM happened
							planRunning(1500);
							return;
						}
						break;
						
					case 'attributes':
						if (mutation.attributeName !== 'ast_checked' && mutation.attributeName !== 'ast_pulsing') {
								// Add the actions to be done here if a changes on DOM happened
								planRunning(1500);
								return;
							}
						break;
				}
			}
		});

		// Register the element root to any relevant change
		observer.observe(window.document, {
			subtree: true,
			childList: true,
			attributes: true
		});
	}
	
	/**
	* Set the 'ON' badge over the icon extension
	* @param {bool} _show - The badge is either displayed or hidden
	*/
	function setBadge(_show) {
		// Ask background.js to perform the change
		chrome.runtime.sendMessage({action: 'setBadge', show: _show});
	}
	
	/**
	* Engage the highlighting of not yet seen images/links
	* @param {string} _urlOrRgx - The exact URL or Regex monitored
	* @param {Object dict} _nfo - Informations of the monitored url (url, root domain, type of media monitored, etc)
	*/
	function highlightWebPage(_urlOrRgx, _nfo) {
		// Store the current epoch time, for further use in the indexedDB as the 'time' row
		window['asleTimestamp'] = new Date().getTime();
		
		const hashed = stringHash32(_urlOrRgx);
		const dbName = 'alse_' + hashed;
		const request = indexedDB.open(dbName, 3);

		// The db doesn't exist
		request.onupgradeneeded = (e) => {
			const db = e.target.result;
			
			// Create the 'link' index
			if (!db.objectStoreNames.contains('link')) {
				let storeLnk = db.createObjectStore('link', { keyPath: 'hash' });
				storeLnk.createIndex('time', 'time', { unique: false });
			}
			
			// Create the 'image' index
			if (!db.objectStoreNames.contains('image')) {
				let storeImg = db.createObjectStore('image', { keyPath: 'hash' });
				storeImg.createIndex('time', 'time', { unique: false });
			}
		};

		request.onsuccess = (e) => {
			const db = e.target.result;
			
			// Links are monitored for this URL
			if (_nfo.lnk === 1)
				retrieveHtml(db, _nfo, 'a[href]:not([ast_checked="true"]):not([href=""])', 'link');

			// Images are monitored for this URL
			if (_nfo.img === 1)
				retrieveHtml(
					db,
					_nfo,
					`picture:not([ast_checked="true"]):has(source[src]:not([src=""]), source[srcset]:not([srcset=""])),
						picture:not([ast_checked="true"]):has(img[src]:not([src=""]), img[srcset]:not([srcset=""])),
						img[src]:not([ast_checked="true"]):not(picture > img):not([src=""]),
						img[srcset]:not([ast_checked="true"]):not(picture > img):not([srcset=""])`,
					'image'
					);
		};
	}
	
	/**
	* Engage the highlighting processing
	* @param {indexedDB} _db - indexedDB of this monitored URL
	* @param {Object dict} _nfo - Informations of the monitored url (url, root domain, type of media monitored, etc)
	* @param {string} _selector - Media type CSS selector for querySelectorAll
	* @param {string} _type - Type of media to monitor
	*/
	function retrieveHtml(_db, _nfo, _selector, _type) {
		const arrNodes = document.querySelectorAll(_selector);
		
		store_process(_type, _nfo, _db, arrNodes);
		store_removeSurplus(_type, _db);
	}
	
	/**
	* Deduplication of href/src hash,
	* check if the hash is already stored in the indexedDB,
	* highlight the link/image if not,
	* add an attribute to ignore this media the next time the script is run,
	*	in the case of a an zero sized image, schedule another run
	* @param {string} _type - Type of media to monitor
	* @param {Object dict} _nfo - Informations of the monitored url (url, root domain, type of media monitored, etc)
	* @param {indexedDB} _db - indexedDB used for this monitored URL
	* @param {Object array} _arr - Array of all HTML nodes corresponding to the media type CSS selector
	*/
	function store_process(_type, _nfo, _db, _arr) {
		const transGet = _db.transaction(_type, 'readwrite');
		const storeGet = transGet.objectStore(_type);
		
		// Array with every HTML nodes and their hash.
		// Used to highlight multiple HTML nodes with the same href/src/srcset (some website use a pari of HTML node, one of which is hidden)
		let arrNodes = []; // {hash: number, node: html ref}
		// Deduplicate array of hash, pair it to an chrome.store.get status (found or missing).
		// Used furtherer to know if a hash is already stored or not (avoiding multiples calls for the same hash),
		// and also after that to process every HTML nodes using their (potentially shared) hash.
		let arrDedup = []; // {hash: number, status: string}
		
		// For each HTML node
		// This closure define if each HTML node met the expectations to be monitored
		_arr.forEach(node => {
			// Define the hash of an HTML node according to its href/src/srcset
			let hash = null;
			switch(node.nodeName) {
				case 'A':
					hash = stringHash32(`${node.href}`);
					break;
					
				case 'PICTURE':
					hash = stringHash32(`${node.querySelectorAll('source, img')[0].src || node.querySelectorAll('source, img')[0].srcset || ''}${node.classList.value || ''}`);
					break;
					
				case 'IMG':
					hash = stringHash32(`${node.src || node.srcset || ''}${node.classList.value || ''}`);
					break;
					
				default:
					hash = stringHash32('NULL');
					
					console.warn('Unexpected nodeName:', node.nodeName, 'E22');
					break;
			}
			const hashAlreadyExists = arrDedup.some(item => item.hash === hash);
			
			// The hash is not yet stored
			if (!hashAlreadyExists) {
				// If the node is not hidden by a parent node
				if (node.checkVisibility()) {
					// Monitored type is link
					if (_type === 'link') {
						// Store every HTML node
						arrNodes.push({hash, node});
				
						// Ignore this HMTL node the next script run
						node.setAttribute('ast_checked', 'true');
						
						// Add this hash to arrDedup to see if it's already stored
						arrDedup.push({hash, status: 'unknown'});
					}
					// Monitored type is image
					else if (_type === 'image') {
						// Get the image size.
						// In case of lazy load, both width and height return 0, leading to plan another script run.
						// An await async JS image creation to retrieve its size with .onload has been studied,
						// but this has been abandoned, as it means changing the loading order of the images, as designed by the site creator.
						let width, height;
						switch(node.nodeName) {
							case 'PICTURE':
								// Retrieve the size of the most representative node of the image
								let loop = 0;
								let nodeCurr = node;
								while (!nodeCurr.clientWidth && !node.width && loop < 5) {
									if (nodeCurr.parentElement) {
										nodeCurr = nodeCurr.parentElement;
										++loop;
									}
									else
										break;
								}
								width = nodeCurr.clientWidth || node.width || 0;
								height = nodeCurr.clientHeight || node.height || 0;
								
								// Store every HTML node
								arrNodes.push({hash, node: nodeCurr});
								break;
								
							case 'IMG':
								width = node.width || 0;
								height = node.height || 0;
								
								// Store every HTML node
								arrNodes.push({hash, node});
								break;
								
							default:
								width = 0;
								height = 0;
								
								// Store every HTML node
								arrNodes.push({hash, node});
								
								console.warn('Unexpected nodeName:', node.nodeName, 'E23');
								break;
						}
						
						
						// If the image size is positive
						if (width > 0 && height > 0) {
							// If no minimum image size is required...
							if ((_nfo.imgsizemin === 0)
								// ... or if minimum image size condition is met
								|| (width * height > _nfo.imgsizemin)) {
								// Add this hash to arrDedup to see if it's already stored
								arrDedup.push({hash, status: 'unknown'});
							}						
							// Else: Ignore this image because its size is >0 but smaller than required
							
							// Ignore this HMTL node the next script run
							node.setAttribute('ast_checked', 'true');
						}
						// The image size is not positive, which is probably due to lazy loading
						else {
							// Create an observer for this image to be warned if its size changes
							const resizeObserver = new ResizeObserver(entries => {
								for (let entry of entries) {
									if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
										planRunning(1500);
										// The image size is now positive, disconnect the observer
										resizeObserver.disconnect();
										return;
									}
								}
							});

							resizeObserver.observe(node);
						}
					}
					else
						console.warn('Unexpected type:', _type, 'E24');
				}
			}
		});
		
		// For each hash/status pair
		// This closure checks if each unique hash exist in the indexedDB
		arrDedup.forEach(elem => {
			// Retrieve this hash from the indexedDB
			let getRequest = storeGet.get(elem.hash);

			getRequest.onsuccess = function(e) {
				// Retrieve any HTML node related to this hash
				const found = arrDedup.find(item => item.hash === elem.hash);
				
				// This hash exists in the indexedDB
				if (e.target.result)
					// Update the status of this arrDedup element
					found.status = 'upd';
				// This hash does not exist in the indexedDB
				else
					// Update the status of this arrDedup element
					found.status = 'new';
			};

			getRequest.onerror = function(e) {
				console.error('requestAdd fail:', e.target.error, 'E20');
			};
    });

		// All storeGet.get from arrDedup.forEach are done
		// This closure creates/updates entries in the indexedDB with the HTML nodes just discovered, according to their hash
    transGet.oncomplete = function() {
			const transPut = _db.transaction(_type, 'readwrite');
			const storePut = transPut.objectStore(_type);
			
			// For all unique hash retrieved from the web page
			arrDedup.forEach(elem => {
				// Operate the update (or the creation) of the indexedDB entry with this hash
				let reqPut = storePut.put({hash: elem.hash, time: window['asleTimestamp']});

				reqPut.onerror = function(e) {
					console.error('requestUpd fail:', e.target.error, 'E21');
				};
				
				// In the last closure, this hash returned as undefined
				if (elem.status === 'new') {
					// Retrieve all HTML nodes having the same href/src/srcset
					const sameNodesAttr = arrNodes.filter(item => item.hash === elem.hash);
					
					sameNodesAttr.forEach(e => {
						// If the HTML node still exist
						if (e.node) {
							// Add the attribute to which the CSS selector for the pulsed animation is registered
							e.node.setAttribute('ast_pulsing', 'true');
						}
					});
				}
			});
    };
	}

	/**
	* Function to remove surplus entries if over max limit
	* @param {string} _type - Type of media to monitor
	* @param {indexedDB} _db - indexedDB of this monitored URL
	*/
	function store_removeSurplus(_type, _db) {
		const transaction = _db.transaction(_type, 'readwrite');
		const store = transaction.objectStore(_type);
		
		// WCS : The Dealabs.com website has 30 elements for each page, and the infinite scrolls can update the DOM up to 10 pages.
		// So it's more than 300 elements since there are also images on the pages other than those of the deals
		// until the user refresh the page by loading the next set of pages (n*10 + 1).
		// So technically, 1000 entries means the user experiences 3 different pages. Which isn't such a huge number after all.
		const maxEntries = 1000;
		
		// Get the count of the records in this indexedDB index
		const countRequest = store.count();
		// Will allow to set the cursor on the desired row
		const index = store.index('time');

		countRequest.onsuccess = function() {
			// Store the number of entries this index has
			const count = countRequest.result;

			// If the count is over maxEntries, we need to delete the oldest entries
			if (count > maxEntries) {
				// Create a cursor request to iterate over the entries sorted by timestamp
				const cursorRequest = index.openCursor(null, 'next'); // Ascending order (oldest first)

				// Define the number of entries to be deleted to reach 1k
				const deleteCount = count - maxEntries;
				// Define the number of entries deleted during the process
				let deleted = 0;

				cursorRequest.onsuccess = function(event) {
					// Define the current position of the cursor in the indexedDB
					const cursor = event.target.result;

					// If the cursor is not undefined && the number of entries to be deleted has not yet been reached
					if (cursor && deleted < deleteCount) {
						// Delete the entry
						const deleteRequest = cursor.delete();
						
						deleteRequest.onsuccess = function() {
							++deleted;
						};

						deleteRequest.onerror = function() {
							console.error('Error deleting entry.', 'E10');
						};

						// Move the cursor to the next position
						cursor.continue();
					}
				};

				cursorRequest.onerror = function() {
					console.error('Error opening cursor to delete old entries.', 'E11');
				};
			}
		};

		countRequest.onerror = function() {
			console.error('Error counting entries in indexedDB.', 'E12');
		};
	}
}