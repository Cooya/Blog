module.exports = () => {
    return {
        type: 'lang',
        regex: /\[([^\[\]]+)\]{([^{}]+)}/gi,
        replace: function (s, title, text) {
            return '<div class="tooltip">' + title + '<span class="tooltiptext">' + text + '</span></div>'
        }
    };
};