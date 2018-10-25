const fs = require('fs');
const path = require('path');
const util = require('util');

const express = require('express');
const Raven = require('raven');
const showdown = require('showdown');
const twig = require('twig');

const config = require('./config');
const gallery = require('./gallery_extension');

const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

process.on('uncaughtException', (e) => {
	console.error(e);
});
process.on('unhandledRejection', (e) => {
	console.error(e);
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
		gallery.load(config.picturesFolderUrl);
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