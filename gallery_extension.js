const showdown = require('showdown');

module.exports = {
    load: (picturesFolderUrl) => {
        showdown.extension('gallery', () => {
            return [
                { 
                    type: 'output',
                    regex: /<img src=".+" alt="([^\"]+)" \/>/gi,
                    replace: function(s, alt) {
                        let res = s.substring(0, s.length - 2) + 'title="' + alt + '">';
                        return res;
                    }
                },
                { 
                    type: 'output',
                    regex: /<img src="([^ ]+)".+>/gi,
                    replace: function(s, url) {
                        if(url.match(/^[^\/]+(.jpg|.jpeg|.png)/)) { // only the filename is provided
                            url = picturesFolderUrl + url;
                            s = s.replace(/src="[^ ]+"/, 'src="' + url.replace('.jpg', '.thumbnail.jpg') + '"');
                        }
                        //return '<a href="' + url + '">' + s + '</a>'; // old fashion
                        return '<div class="item" data-src="' + url + '">' + s + '</div>'
                    }
                },
                {
                    type: 'output',
                    regex: /<p>(<div class="item" ((?!<p>).|\n)+)<\/p>/gi,
                    replace: function(s, match) {
                        return '<div class="lightgallery">' + match + '</div>';
                    }
                }
            ];
        });
    }
};