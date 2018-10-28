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
let posts;
twig.cache(process.env.NODE_ENV == 'production');
app.set('views', config.postsFolder);

app.get('/', (req, res, next) => {
	res.redirect('/nz');
});

app.get('/:name', (req, res, next) => {
	const postData = posts[req.params.name];
	if(!postData)
		return res.send('Comme tu peux voir, il n\'y a rien ici...')
	//console.debug(postData);
	
	res.render(config.templatesFolder + postData.post_template + '_post.twig', postData);
});

if(process.env.NODE_ENV == 'test')
	module.exports = app;
else {
	(async () => {
		gallery.load(config.picturesFolderUrl, config.pictureWidths);
		posts = await convertPosts(config.markdownFolder, config.postsFolder);

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
		
		// we create a new post in the posts container
		const postId = fileName.replace('.md', '');
		posts[postId] = {};

		// we read the file, extract its header and save it as a JSON object
		let fileContent = (await readFile(markdownFolder + fileName)).toString();
		const postDataAndContent = extractHeaderFromPost(fileContent);
		if(postDataAndContent.header) {
			fileContent = postDataAndContent.content; // post content whithout header
			posts[postId] = postDataAndContent.header;
		}
		
		// and we convert the markdown file to an html file
		const destHtmlFileName = postId + '.html';
		const html = new showdown.Converter({strikethrough: true, extensions: ['gallery']}).makeHtml(fileContent);
		await writeFile(htmlFolder + destHtmlFileName, html);
		posts[postId].html_file = destHtmlFileName;
	});
	return posts;
}

function extractHeaderFromPost(postContent) {
	let header = postContent.match(/{(.|\n)+}\n\n/);
	if(!header || !header[0]) {
		console.warn('No header found.');
		return {};
	}

	postContent = postContent.substr(header[0].length);

	try {
		return {
			header: JSON.parse(header[0].replace(/\n/g, '')),
			content: postContent
		};
	}
	catch(e) {
		console.error('JSON parse error !')
		return {};
	}
}