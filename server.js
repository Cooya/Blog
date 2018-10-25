const fs = require('fs');
const path = require('path');
const util = require('util');

const showdown = require('showdown');
const config = require('./config.js');
const express = require('express');
const Raven = require('raven');
const twig = require('twig');

const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

process.on('uncaughtException', (e) => {
	console.error(e);
});
process.on('unhandledRejection', (e) => {
	console.error(e);
});

showdown.extension('gallery', function() {
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
					url = config.picturesFolderUrl + url;
					s = s.replace(/src="[^ ]+"/, 'src="' + url + '"');
				}
				//return '<a href="' + url + '">' + s + '</a>'; // old fashion
				return '<div class="item" data-src="' + url.replace('.thumbnail', '') + '">' + s + '</div>'
            }
		},
		{
			type: 'output',
			regex: /<p>(<div class="item" ((?!<p>).|\n)+)<\/p>/gi,
			replace: function(s, match) {
				return '<div class="lightgallery">' + match + '</div>';
			}
		}
    ]
});

if(config.sentryEndpoint)
	Raven.config(config.sentryEndpoint, {
		shouldSendCallback: (data) => {
			return process.env.NODE_ENV == 'production'
		}
	}).install();

const app = express();
twig.cache(false);
app.set('views', config.postsFolder);

app.get('/', (req, res, next) => {
	res.redirect('/nz');
});

app.get('/:name', (req, res, next) => {
	res.render(config.templatesFolder + 'post.twig', {post_html_file: req.params.name + '.html'});
});


if(process.env.NODE_ENV == 'test')
	module.exports = app;
else {
	(async () => {
		await convertPosts(config.markdownFolder, config.postsFolder);

		app.use('/static', express.static(config.staticFolder));

		console.log('Server started on port ' + config.serverPort + ', waiting for requests...');
		app.listen(config.serverPort);
	})();
}

async function convertPosts(markdownFolder, htmlFolder) {
	const posts = [];
	const files = await readDir(markdownFolder);
	files.forEach(async (fileName) => {
		if(path.extname(fileName) != '.md')
			return;
		let fileContent = (await readFile(markdownFolder + fileName)).toString();
		//const header = extractHeaderFromPost(fileContent, fileName);
		//posts.push(header.post);
		//fileContent = fileContent.substring(header.length).trim();
		let html = new showdown.Converter({extensions: ['gallery']}).makeHtml(fileContent);
		//html = insertGalleryDivs(html);
		await writeFile(htmlFolder + fileName.replace('.md', '.html'), html);
	});
	return posts;
}

function extractHeaderFromPost(fileContent, fileName) {
	const result = fileContent.match(/(^[\S\s]+)~~~/);
	let header = result && result[1];
	header = header.trim();
	header = header ? JSON.parse(header) : {};
	header.slugUrl = fileName.replace('.md', '');
	return {post: header, length: result[0].length};
}