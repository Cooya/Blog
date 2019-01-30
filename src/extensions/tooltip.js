module.exports = () => {
	return {
		type: 'lang', // before HTML convertion
		regex: /\[([^\[\]]+)\]{([^{}]+)}/gi,
		replace: function(s, title, text) {
			return (
				'<div class="tooltip">' +
				title +
				'<span class="tooltiptext">' +
				text +
				'</span></div>'
			);
		}
	};
};
