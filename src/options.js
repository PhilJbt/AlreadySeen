/**
* Entry point
*/
document.addEventListener('DOMContentLoaded', () => {
	init();
});

/**
* Bind callbacks to all user inputs, declare functions
*/
function init() {
	/**
	* If the last active tab url is stored, pre-fill the URL text input with it
	*/
	chrome.storage.sync.get('lastActiveTabUrl', (data) => {
		// The URL text input
    const inpText = document.getElementById('inp-url');
		
		// The lastActiveTabUrl object exists in the storage
    if (data.lastActiveTabUrl) {
			// Check if the URL is from a website (e.g. not chrome://extensions/, etc)
			let urlNoProtocols = getDomainOnly(data.lastActiveTabUrl || '');
			let urlDomOnly = trimSubdomain(urlNoProtocols || '', false);
			
			// The stored URL has a http or https scheme
			if (urlDomOnly !== null
			&& urlDomOnly !== undefined
			&& urlDomOnly !== '') {
				inpText.value = data.lastActiveTabUrl;
				
				// Store the URL to highlight any corresponding sld collapsible
				window['lastActiveTabUrl'] = data.lastActiveTabUrl;
				
				chrome.storage.sync.set({ lastActiveTabUrl: null });
			}
    }
  });
	
	/**
	* Hide the error box when the user focuses the URL text input
	*/
	document.getElementById('inp-url').addEventListener("focus", () => {
		document.getElementsByClassName('noteError')[0].innerHTML = '';
	});
	
	/**
	* Hide or show the image size input text depending on the image checkbox status
	*/
	document.getElementById('chk-images').addEventListener("change", (e) => {
		if (e.srcElement.checked)
			document.getElementById('cont-imagesSizeMin').style.display = 'block';
		else
			document.getElementById('cont-imagesSizeMin').style.display = 'none';
	});
	
	/**
	* Export the urls list stored to a file
	*/
	document.getElementById('btn-export').addEventListener('click', function() {
		// Get the current date
		const t = new Date();
		const y = t.getFullYear();
		const m = String(t.getMonth() + 1).padStart(2, '0');
		const d = String(t.getDate()).padStart(2, '0');
		
		// Get all urls
		chrome.storage.sync.get(['urls'], function(result) {
			const blob = new Blob([JSON.stringify(result.urls)], { type: 'text/plain' });
			const url = URL.createObjectURL(blob);

			// Use the Chrome downloads API to download the file
			chrome.downloads.download({
				url: url,
				filename: `AlreadySeen-backup_${y}${m}${d}.txt`,
				saveAs: true
			});
		});
	});
	
	/**
	* Import a file to the urls list stored
	*/
	document.getElementById('btn-import').addEventListener('input', function() {
		// Get the selected file
		const file = event.target.files[0];

		// The is at least on valid file selected
		if (file) {
			// Declare the reader
			const reader = new FileReader();

			// Define the processing behavior of the reader
			reader.onloadend = function(e) {
				try {
					// Retrieve the imported data
					const content = e.target.result;
					const arrData = JSON.parse(content);
					
					// Get the currently stored urls
					chrome.storage.sync.get(['urls'], function(result) {
						// Merge the currently store urls with the imported list
						let arrUrls = Object.assign({}, result.urls || [], arrData);
						
						// Save the updated urls list
						chrome.storage.sync.set({ ['urls']: arrUrls });
						
						// Purge the displayed list of monitored URLs
						document.getElementById('list-monit').innerHTML = '';
						
						// Fill the displayed list of monitored URLs with the merged monitored URLs list
						for (const [dom, url] of Object.entries(arrUrls)) {
							if (typeof(dom) === 'string' && typeof(url) === 'object') {
								for (const [key, val] of Object.entries(url)) {
									appendUrlToList({
										lnk: val.lnk ? 1 : 0,
										img: val.img ? 1 : 0,
										rgx: val.rgx ? 1 : 0,
										imgsizemin: val.imgsizemin,
										dom: dom,
										url: key,
										dbid: stringHash32(key)
									},
									undefined, false);
								}
							}
						}
					});
				}
				catch(err) {}
			};

			// Run the reader processing
			reader.readAsText(file);
		}
	});

	/**
	* Add button adding an URL to the monitored URLs list stored
	*/
	document.getElementById('btn-add').addEventListener('click', (e) => {
		// Hide the error box
		document.getElementsByClassName('noteError')[0].innerHTML = '';
		
		// The user forgot to select at least one type of media to monitor
		if ((!document.getElementById('chk-links').checked
		&& !document.getElementById('chk-images').checked)) {
			showErr('notif_err_notLnkNorImg');
			return;
		}
		
		// Get the URL given by the user
		let url = document.getElementById('inp-url').value;
		
		// Declare for furtherer use, after both regex/strict processing
		let urlDomOnly = ''; // Do NOT remove in case of refacto
		
		// Stop the processing if the user pressed "ADD" by mistake (empty string)
		if (url === undefined || url === null || url === '')
			return;
		
		// Process the given URL as a regex
		if (document.getElementById('chk-regex').checked) {
			// Unescape automatically escaped characters
			url = url.replace(/\\\\/g, '\\');
			
			// The regex do not includes any protocol
			if (url.match(/(https?:\\\/\\\/)/gi) === null) {
				showErr('notif_err_noProtocls');
				return;
			}
			
			// The given regex is valid
			try {
				new RegExp(url);
			} catch(e) {
				showErr('notif_err_unproperRegex');
				return;	
			}
		
			// Try to remove the protocol from the regex
			let urlNoProtocols = url.substr(url.search(/(https?:(\\)?\/(\\)?\/?)/gi));
			// Remove any port/path/anchor/etc
			urlDomOnly = getDomainOnly(escapeRegex(urlNoProtocols) || '');
			
			// The regex seems malformed, retrieve any URL is impossible
			if (!urlDomOnly) {
				alert(chrome.i18n.getMessage('notif_err_protocolsRemove_fail'));
				return;
			}
			
			// Try to retrieve both sld and tld
			urlDomOnly = trimSubdomain(urlDomOnly || '', false);
			
			// Regex may not include any sld and/or tld
			if (urlDomOnly === undefined || urlDomOnly === '') {
				// Warn the user this is tricky
				if (confirm(chrome.i18n.getMessage('cnfrm_err_sldtld')) !== true) {
					return;
				}
				// Trust the user, they're an engineer
				else {
					// Regex has no sld and/or tld, making it impossible to delete subdomains, ask them their sld
					let userDom = prompt(chrome.i18n.getMessage('prompt_err_sldtld'), 'example\\..+');
					// In case the user isn't an engineer, after all
					if (!userDom) return;
					
					urlDomOnly = userDom.toLowerCase();
				}
			}
		}
		// Process the given URL as a simple URL
		else {
			// Check if the scheme is a valid protocol
			if (url.match(/^(https?:\/\/?)/gi) === null) {
				showErr('notif_err_noProtocls');
				return;
			}
			
			// Get the URL without protocol
			urlNoProtocols = getDomainOnly(url || '');
			
			// Impossible to retrieve any URL when removing the protocol
			if (!urlNoProtocols) {
				alert(chrome.i18n.getMessage('notif_err_protocolsRemove_fail'));
				return;
			}
			
			// Get the sld/tld only
			urlDomOnly = trimSubdomain(urlNoProtocols || '', false);
			
			// Strict URL has no sld and/or tld
			if (urlDomOnly === undefined || urlDomOnly === '') {
				showErr('notif_err_sldtld');
				return;
			}
		}
		
		// Get the minimum image area given
		const imgSizeMin = (document.getElementById('inp-imagesSizeMin').value || 0);
		
		// Get the HTML collapsible node ID
		const nameCollapsible = `colapsible-${stringHash32(urlDomOnly)}`;
		
		// Get the HTML collapsible node
		const nodeCollapsible = document.getElementById(nameCollapsible);
		
		// If the collapsible node corresponding to this
		// second-level domain exists in the displayed list
		if (nodeCollapsible) {
			// 
			nodeCollapsible.parentElement.classList.add('origin');
			nodeCollapsible.setAttribute('open', '');
			
			// Retrieve all the entries from the HTML displayed list
			let nodesEntrySameUrlAdd = Array.from(nodeCollapsible.querySelectorAll('.txt-url'));
			
			// Filter the entries list corresponding to the exact URL or regex given
			nodesEntrySameUrlAdd.filter((e) => {
				// If the entry in the displayed HTML list match with the given URL or regex
				if (e.innerHTML === url)
					// Remove the entry
					e.parentElement.remove();
			});
		}
		
		// Create a new HTML node with the URL or regex given,
		// and append/prepend it to the HTML displayed list
		// depending on the current situation (first load, import, manual add)
		const newElem = appendUrlToList({
				lnk: document.getElementById('chk-links').checked ? 1 : 0,
				img: document.getElementById('chk-images').checked ? 1 : 0,
				imgsizemin: (imgSizeMin < 0 ? 0 : imgSizeMin),
				rgx: document.getElementById('chk-regex').checked ? 1 : 0,
				dom: urlDomOnly,
				url: url,
				dbid: stringHash32(url)
			},
			urlDomOnly,
			true
		);
		
		// Add the origin class to the new HTML node created to apply a border style to it
		newElem.classList.add('origin');
		
		// Update the browser's URL with the collapsible ID to make it visible on screen
		window.location.hash = nameCollapsible;
		
		// Retrieve all stored monitored URLs
		chrome.storage.sync.get('urls', function(result) {
			let arr = result.urls || {};
			
			// If the sld is not yet monitored
			if (!arr[urlDomOnly])
				// Add an entry to collect any URLs corresponding to this sld
				arr[urlDomOnly] = {};

			// Add an entry with the monitored URL infos to this sld slot
			arr[urlDomOnly][url] = {
				img: (document.getElementById('chk-images').checked ? 1 : 0),
				imgsizemin: imgSizeMin,
				lnk: (document.getElementById('chk-links').checked ? 1 : 0),
				rgx: (document.getElementById('chk-regex').checked ? 1 : 0)
			};
			
			// Override the stored monitored list with the updated one
			saveUrls(arr);
			
			// Reset all inputs states
			document.getElementById('inp-url').value = '';
			document.getElementById('chk-images').checked = false;
			document.getElementById('chk-links').checked = false;
			document.getElementById('chk-regex').checked = false;
			document.getElementById('inp-imagesSizeMin').value = 0;
			document.getElementById('cont-imagesSizeMin').style.display = 'none';
		});
	});
	
	/**
	* Retrieve the monitored list of URLs and display it in the HTML list
	* when opening the options page.
	*/
	chrome.storage.sync.get('urls').then((result) => {
		// If there are some stored URLs
		if (result.urls) {
			let lastActiveTabDom = undefined;
			
			// If the last active tab URL has been stored
			if (window['lastActiveTabUrl'] !== undefined) {
				// Only retrieve the sld and tld combo
				lastActiveTabDom = getDomainOnly((new URL(window['lastActiveTabUrl'])).host || '');
				lastActiveTabDom = trimSubdomain(lastActiveTabDom || '', false) || undefined;
				
				window['lastActiveTabUrl'] = undefined;
			}
			
			// Iterate over all monitored domains
			for (const [dom, url] of Object.entries(result.urls)) {
				if (typeof(dom) === 'string' && typeof(url) === 'object') {
					// Iterate over all monitored URLs
					for (const [key, val] of Object.entries(url)) {
						if (key && typeof(key) === 'string'
						&& val.img !== null && typeof(val.img) === 'number'
						&& val.lnk !== null && typeof(val.lnk) === 'number') {
							// Push this URLs to the HTML displayed list
							appendUrlToList({lnk: val.lnk, img: val.img, imgsizemin: val.imgsizemin, rgx: val.rgx, dom: dom, url: key, dbid: stringHash32(key)}, lastActiveTabDom, false);
						}
					}
				}
			}
			
			// Update the browser's URL with the collapsible ID to make it visible on screen
			if (lastActiveTabDom)
				window.location.hash = `colapsible-${stringHash32(lastActiveTabDom)}`;
		}
	});

	/**
	* Push an entry to the HTML displayed list
	* @param {Object dict} _nfo - Informations of the monitored url (url, root domain, type of media monitored, etc)
	* @param {string} _domToHighlight - The domain whose corresponding collapsible is to be highlighted
	* @param {bool} _prepend - Either the new HTML node should be prepended or appended to the HTML list
	* @return {HTML node} The <li> new element created
	*/
	function appendUrlToList(_nfo, _domToHighlight, _prepend) {
		// Root entry node
		let li = document.createElement('li');
		// Node to display URL infos
		let nfo = document.createElement('div');
		nfo.classList.add('nfo');
		
		// Insert URL infos to the HTML node
		nfo.innerHTML = `
		${_nfo.lnk !== 0 ? '<div class="lbl lnk">link</div>' : ''}
		${_nfo.img !== 0 ? `<div class="lbl img">image ${_nfo.imgsizemin > 0 ? `(>${_nfo.imgsizemin}px)` : ''}</div>` : ''}
		${_nfo.rgx !== 0 ? '<div class="lbl rgx">regex</div>' : ''}
		`;
		
		// Create a delete button
		let btn = document.createElement('a');
		btn.classList.add('btn-del');
		btn.addEventListener('click', function(){
			delDb(
				li,
				{
					dom: _nfo.dom,
					url: _nfo.url,
					rgx: _nfo.rgx,
					dbid: _nfo.dbid
			});
		}, false);
		// Append the delete button to the URL infos node
		nfo.append(btn);
		
		// Prepend the URL infos node to the root node
		li.prepend(nfo);
		
		// Create the URL/regex text to display
		let txt = document.createElement('div');
		txt.classList.add('txt-url');
		txt.innerText = _nfo.url;
		// Prepend the URL text to the root node
		li.prepend(txt);
		
		// Get the HTML collapsible node ID
		const domListID = `colapsible-${stringHash32(_nfo.dom)}`;
		// Get the HTML collapsible node
		const domList = document.getElementById(domListID);
		
		// If the HTML collapsible node does no exist
		if (!domList) {
			// Get the HTML node of the same sld and tld combo
			let rootDomList = document.createElement('article');
			
			// If there is a domain to highlight, and the URL added is corresponding to it
			let isOpened = false;
			if (_domToHighlight !== undefined
			&& _nfo.dom.indexOf(_domToHighlight) > -1) {
				isOpened = true;
				// Apply a border to the domain collapsible node
				rootDomList.classList.add('origin');
			}
			
			// Insert the HTML to the domain entry node
			rootDomList.innerHTML = 
			`<details id="${domListID}" ${isOpened ? 'open' : ''}>
				<summary>${_nfo.dom}</summary>
			</details>`.trim();

			// Depending on the situation, prepend or append the the domain entry node
			const list = document.getElementById('list-monit');
			if (_prepend)
				list.prepend(rootDomList); // manual add
			else
				list.append(rootDomList); // options init, import
		}
		
		// Append the URL entry to the domain entry node
		document.getElementById(domListID).append(li);
		
		// Return the URL entry
		return li;
	}

	/**
	* Delete an entry from the stored monitored list,
	* ask the user the confirmation to delete this entry, warn the user of the open/close tab procedure if a strict URL,
	* open and then close a new tab with the corresponding root domain to erase the corresponding indexedDb.
	* @param {HTML node} _li - The li HTML node of the URL/regex entry displayed in the HTML list
	* @param {Object dict} _nfo - Informations of the monitored url (url, root domain, type of media monitored, etc)
	*/
	function delDb(_li, _nfo) {
		// Depending on the entry is an regex or a strict URL, ask confirmation for deletion,
		// and war the user a new tab will open to delete the indexedDb.
		if (confirm(chrome.i18n.getMessage(_nfo.rgx === 1 ? 'cnfrm_delEntryRgx' : 'cnfrm_delEntryStrict')) !== true)
			return;

		// Apply a red strikethrough style to the entry
		_li.classList.add('deleted');
		
		// Retrieve the stored monitored URLs list
		chrome.storage.sync.get('urls', function(result) {
			if (result.urls
			&& result.urls[_nfo.dom]
			&& result.urls[_nfo.dom][_nfo.url]) {
				// Remove the entry from the list
				delete result.urls[_nfo.dom][_nfo.url];
				
				// If there is no more URLs monitored for this domain
				if (Object.keys(result.urls[_nfo.dom]).length === 0)
					// Remove the entry for this domain
					delete result.urls[_nfo.dom];
				
				// Override the stored monitored list with the updated one
				saveUrls(result.urls);
			}
			else
				showErr('lr_err_fromdb');
		});
		
		// The entry is a strict URL
		if (_nfo.rgx === 0) {
			// 
			chrome.runtime.sendMessage({action: 'deleteDB', nfo: _nfo}, (response) => {
				if (response.status === 'deletion-done') {
					// Remove the entry from the HTML displayed list
					_li.remove();
					
					// Remove a domain collapsible from the HTML displayed list if empty
					displayedListRemoveDomLine(_nfo.dom);
				}
				else
					showErr('lr_err_deldb');
			});
		}
		// The entry is a regex
		else {
			// Remove the entry from the HTML displayed list
			_li.remove();
			
			// Remove a domain collapsible from the HTML displayed list if empty
			displayedListRemoveDomLine(_nfo.dom);
		}
	}
	
	/**
	* Remove a domain collapsible from the HTML displayed list if empty
	* @param {string} _dom - The domain name the collapsible to remove from the HTML displayed list if empty
	*/
	function displayedListRemoveDomLine(_dom) {
		// Get the collapsible HTML node corresponding to the given domain
		const divDetails = document.getElementById(`colapsible-${stringHash32(_dom)}`);
		
		// If the HTML node exists and have no childs
		if (divDetails
		&& divDetails.querySelectorAll('li').length === 0)
			// Remove the whole collapsible (from its parent container)
			divDetails.parentNode.remove();
	}

	/**
	* Override the stored monitored URLs with a new set
	* @param {Object array} _arr - The new set of monitored URLs
	*/
	function saveUrls(_arr) {
		// Override the stored data with a new set
		chrome.storage.sync.set({ urls: _arr }, function() {
			if (chrome.runtime.lastError)
				console.error('Error saving data:', chrome.runtime.lastError);
		});
	}

	/**
	* Show a message in the HTML error box
	* @param {string} _message - The error message
	*/
	function showErr(_message) {
		document.getElementsByClassName('noteError')[0].innerHTML = chrome.i18n.getMessage(_message);
	}
}

/**
* Delete all URLS stored for monitoring
* For dev purpose only, not binded to any element in the interface.
* Since it doesn't delete any indexedDb, I don't make this function accessible.
*/
function DEBUG_delAllStoredUrls() {
	chrome.storage.sync.set({ ['urls']: null });
}