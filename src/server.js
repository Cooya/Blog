const express = require('express');
const logger = require('@coya/logger')(require('../config').logging);
const Raven = require('raven');
const twig = require('twig');

const config = require('../config');
const converter = new (require('./converter'))(config.markdownFolder, config.postsFolder);

process.on('uncaughtException', e => {
	logger.error(e);
});
process.on('unhandledRejection', e => {
	logger.error(e);
});

// configure Raven to report error if Sentry endpoint is specified
if (config.sentryEndpoint)
	Raven.config(config.sentryEndpoint, {
		shouldSendCallback: data => {
			return process.env.NODE_ENV == 'production';
		}
	}).install();

// create the express app
const app = express();
twig.cache(false); // enable the cache prevents refreshing when templates are modified...
app.set('views', config.postsFolder);

// define the server routes
app.get('/', (req, res, next) => {
	res.redirect('/nz');
});
app.get('/:postId([a-z0-9/-]+)', async (req, res, next) => {
	const post = await converter.getPost(req.params.postId);
	if (!post) return res.send("Comme tu peux voir, il n'y a rien ici...");

	res.render(config.templatesFolder + 'post.twig', post);
});

if (process.env.NODE_ENV == 'test') module.exports = app;
// for unit tests, only the express app is required, no need to run the server
else {
	(async () => {
		// convert the markdown files into html files
		await converter.convertFiles();

		// define the static folder for static assets delivering
		app.use('/static', express.static(config.staticFolder));

		// run the server on the port defined the config file
		logger.info('Server started on port ' + config.serverPort + ', waiting for requests...');
		app.listen(config.serverPort);
	})();
}
