module.exports = (picturesFolderUrl, pictureWidths) => {
	return [
		{
			type: 'output', // after HTML convertion
			regex: /<img src=".+" alt="([^\"]+)" \/>/gi,
			replace: function(s, alt) {
				let res = s.substring(0, s.length - 2) + 'title="' + alt + '">';
				return res;
			}
		},
		{
			type: 'output', // after HTML convertion
			regex: /<img src="([^ ]+)".+>/gi,
			replace: function(s, url) {
				let data = '';
				if (url.match(/^[^\/]+(.jpg|.jpeg|.png)/)) {
					// only the filename is provided
					url = picturesFolderUrl + url;
					s = s.replace(
						/src="[^ ]+"/,
						'src="' + url.replace('.jpg', '-thumbnail.jpg') + '"'
					);
					for (let width of pictureWidths)
						data += url.replace('.jpg', '-' + width + '.jpg') + ' ' + width + ', ';
				}
				//return '<a href="' + url + '" data-responsive="' + data + '">' + s + '</a>'; // old fashion
				return (
					'<div class="item column is-one-quarter-desktop is-one-third-tablet is-half-mobile" data-src="' +
					url +
					'" data-responsive="' +
					data +
					'">' +
					s +
					'</div>'
				);
			}
		},
		{
			type: 'output', // after HTML convertion
			regex: /<p>(<div class="[a-z0-9\- ]+" ((?!<p>).|\n)+)<\/p>/gi,
			replace: function(s, match) {
				return (
					'<div class="lightgallery columns is-centered is-multiline is-mobile is-variable is-1">' +
					match +
					'</div>'
				);
			}
		}
	];
};
