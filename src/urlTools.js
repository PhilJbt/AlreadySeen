/**
* Clean the given url
* @param {string} _url - Given domain
* @return {string} Domain without spaces, protocol, path nor parameters
*/
function getDomainOnly(_url, _keepProtocol = false) {
	if ((_url || '').length > 0) {
		let newUrl = _url.trim();
		
		if (_keepProtocol) {
			newUrl = newUrl.split(/(https?:\/\/)/gi);
			newUrl.shift();
			
			if (newUrl[1].indexOf('/') > -1)
				newUrl[1] = newUrl[1].substr(0, newUrl[1].indexOf('/'));
			
			newUrl = newUrl.join('');
		}
		else {
			newUrl = newUrl.replace(/^(https?:\/\/?)/i, '');
			if (newUrl.indexOf('/') > -1)
				newUrl = newUrl.substr(0, newUrl.indexOf('/'));
		}
		
		return newUrl;
	}
	else
		return '';
}

/**
* Retrieve only the domain (with or without sub-domains) of the given url
* @param {(string || psl object)} _url - Given domain
* @param {bool} _sub - Keep subdomain(s)
* @return {string} The domain with or without sub-domains
*/
function trimSubdomain(_url, _sub) {
	if ((_url || '').length > 0) {
		let url = typeof(_url) === 'string' ? psl.parse(_url) : _url;
		const f = _sub === true ? ((url.subdomain !== null ? url.subdomain + '.' : '') + url.domain) : url.domain;
		return f;
	}
	return '';
}

/**
* Calculate the unique hash number of a given string
* Author: https://github.com/ampproject/amphtml/blob/371a072ed4986410b3671469f603e88721890bad/src/string.js#L121-L129
* @param {string} _str - String to hash
* @return {number} Hash of the string
*/
function stringHash32(_str) {
	const length = _str.length;
	let hash = 5381;
	for (let i = 0; i < length; i++) {
		hash = hash * 33 ^ _str.charCodeAt(i);
	}
	// Convert from 32-bit signed to unsigned.
	return String(hash >>> 0);
};

/**
* Escape special regex characters from a given string
* @param {string} _str - String to escape regex special characters
* @return {string} String with special regex special characters escaped
*/
function escapeRegex(_str) {
	return _str.replace(/[\\|&;$%@"<>()+,]/g, '');
	//return _str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
