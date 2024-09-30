/**
* ENTRY POINT
*/
loadExample();
changeInpStrBeg(document.getElementById('chk-strend'));

/**
* Escape special regex characters from an input string
* @param {string} _str - String to escape special regex characters
* @return {string} String with special regex characters escaped
*/
function escapeRegex(_str) {
		return _str.replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&');
}

/**
* Generate the final regex in accordance with the user's inputs
* @return {Object Regex} ___________DESCRIPTION___________
*/
function generateRegex() {
	const protocol = document.getElementById('protocol').value;
	const url = document.getElementById('urlInput').value;
	const potential = document.getElementById('potential').value.split('\n').map(term => term.trim()).filter(term => term !== '');
	const blacklist = document.getElementById('blacklist').value.split('\n').map(term => term.trim()).filter(term => term !== '');
	const strBeg = document.getElementById('chk-strbeg').checked ? '^' : '';
	const strEnd = document.getElementById('chk-strend').checked ? '$' : '';

	const potentialRegex = potential.map(term => `(${term})?`).join('');
	const blacklistRegex = blacklist.map(term => `(?!.*${term})`).join('');

	const fullRegex = `${strBeg}${blacklistRegex}${escapeRegex(protocol)}${escapeRegex(url)}${potentialRegex}${strEnd}`;
	
	// Display the generated regex
	document.getElementById('generatedRegex').value = fullRegex;

	return new RegExp(fullRegex);
}

/**
* Test the list of URLs against the generated regex
*/
function testRegex() {
	// There is no URL, exit the function
	if (document.getElementById('urlInput').value.length === 0) {
		document.getElementById('results').value = '';
		return;
	}

	const regex = generateRegex();
	const testUrls = document.getElementById('testUrls').value.split('\n');
	let results = '';

	// Test each URLs provided by the user against the generated regex
	testUrls.forEach(url => {
		if (url[0] !== '#') {
			const isMatch = new RegExp(regex).test(url.trim());
			results += `${isMatch ? '\u2714\ufe0f' : '\u274c'} ${url.trim()}\n`;
		}
		else {
			results += `${url}\n`;
		}
	});

	// Display the result of tested URLs
	document.getElementById('results').value = results;
}

/**
* Copy the generated regex to clipboard
*/
function copyToClipboard() {
		const regexInput = document.getElementById('generatedRegex');
		regexInput.select();
		regexInput.setSelectionRange(0, 99999); // For mobile devices

		document.execCommand('copy');
		
		alert("Regex copied to clipboard: " + regexInput.value);
}


/**
* Disable the potential list text area depending on the begin string delimiter checkbox status
* @param {___________TYPE___________} ___________PARAMNAME___________ - ___________DESCRIPTION___________
*/
function changeInpStrBeg(_e) {
	const inpPotential = document.getElementById('potential');
	if (_e.checked)
		inpPotential.disabled = false;
	else
		inpPotential.disabled = true;
}

/**
* Generate regex whenever an user input changes
*/
document.getElementById('protocol').addEventListener('change', function(e) {
	generateRegex();
	testRegex();
});
document.getElementById('urlInput').addEventListener('input', function(e) {
	generateRegex();
	testRegex();
});
document.getElementById('potential').addEventListener('input', function(e) {
	generateRegex();
	testRegex();
});
document.getElementById('blacklist').addEventListener('input', function(e) {
	generateRegex();
	testRegex();
});
document.getElementById('chk-strbeg').addEventListener('change', function(e) {
	generateRegex();
	testRegex();
});
document.getElementById('chk-strend').addEventListener("change", function(e) {
	changeInpStrBeg(e.srcElement);
	generateRegex();
	testRegex();
});
document.getElementById('testUrls').addEventListener('input', function(e) {
	generateRegex();
	testRegex();
});

/**
* Select the text in the generated regex input text when the user clicks on it
*/
document.getElementById('generatedRegex').addEventListener('click', (e) => {
	e.srcElement.select();
	e.srcElement.setSelectionRange(0, 99999); // For mobile devices
});

/**
* Pre-fill inputs, run regex generation and give test URLs results
* if the example URL param exists
*/
function loadExample() {
	// Retrieve the action URL param
	const urlParam = new URL(location.href).searchParams.get('action');
	
	// If the action URL param exists
	if (urlParam) {
		// Example 1
		if (urlParam === 'example1') {
			document.getElementById('chk-strbeg').checked = false;
			document.getElementById('chk-strend').checked = false;
			document.getElementById('urlInput').value = 'www.example.com/?type=movie';
			document.getElementById('potential').value = '';
			document.getElementById('blacklist').value = 'genre=\nyear=\nletter=';
			document.getElementById('testUrls').value = [
				'# MATCHING URLS:\n',
				'https://www.example.com/?type=movie\n',
				'https://www.example.com/?type=movie&quality=HD\n',
				'https://www.example.com/?type=movie&page=2\n',
				'# NOT MATCHING PROTOCOLS:\n',
				'http://example.com/\n',
				'http://www.example.com/?type=movie\n',
				'# NOT MATCHING:\n',
				'https://example.com/\n',
				'https://www.example.com/\n',
				'https://www.example.com/?type=anime\n',
				'https://www.example.com/?type=anime&page=2\n',
				'# BLACKLISTED TERMS:\n',
				'https://www.example.com/?type=movie&genre=comedy\n',
				'https://www.example.com/?type=movie&year=2024\n',
				'https://www.example.com/?type=movie&year=2024&page=2'
			].join('');
			testRegex();
		}
		// Example 2
		else if (urlParam === 'example2') {
			document.getElementById('chk-strbeg').checked = false;
			document.getElementById('chk-strend').checked = true;
			document.getElementById('urlInput').value = 'www.example.com/?type=movie';
			document.getElementById('potential').value = '&page=\\d';
			document.getElementById('blacklist').value = 'genre=\nyear=\nletter=';
			document.getElementById('testUrls').value = [
				'# MATCHING URLS:\n',
				'https://www.example.com/?type=movie\n',
				'https://www.example.com/?type=movie&page=2\n',
				'# NOT MATCHING PROTOCOLS:\n',
				'http://example.com/\n',
				'http://www.example.com/?type=movie\n',
				'# NOT MATCHING:\n',
				'https://example.com/\n',
				'https://www.example.com/\n',
				'https://www.example.com/?type=anime\n',
				'https://www.example.com/?type=anime&page=2\n',
				'https://www.example.com/?type=movie&quality=HD\n',
				'# BLACKLISTED TERMS:\n',
				'https://www.example.com/?type=movie&genre=comedy\n',
				'https://www.example.com/?type=movie&year=2024\n',
				'https://www.example.com/?type=movie&year=2024&page=2'
			].join('');
			testRegex();
		}
		// Reset inputs
		else if (urlParam === 'null' || urlParam === 'undefined' || urlParam === 'none' || urlParam === 'empty') {
			document.getElementById('chk-strbeg').checked = false;
			document.getElementById('chk-strend').checked = false;
			document.getElementById('urlInput').value = '';
			document.getElementById('potential').value = '';
			document.getElementById('blacklist').value = '';
			document.getElementById('testUrls').value = '';
			testRegex();
		}
		// Warn the suer the example asked does not exist
		else
			alert(`Unknown example: ${urlParam}`);
	}
}