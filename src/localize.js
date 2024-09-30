/**
* Entry point
*/
localize();

/**
* Apply localization
*/
function localize() {
	// For each html node having a localization attribute
	document.querySelectorAll('[data-i18n]').forEach((e) => {
		// Get the name of the string stored in messages.json
		const attr = e.getAttribute('data-i18n');
		// Get the three first letters of the name
		switch(attr.substr(0, 3)) {
			// Placeholder
			case 'ph_':
				e.placeholder = chrome.i18n.getMessage(attr);
				break;
			// User data-
			case 'tl_':
				e.setAttribute('data-tooltip', chrome.i18n.getMessage(attr));
				break;
			// InnerHTML
			case 'ih_':
				e.innerText = chrome.i18n.getMessage(attr);
				break;
			// Value
			case 'vl_':
				e.value = chrome.i18n.getMessage(attr);
				break;
		}
	});
}