const {Counter, countVisitors} = require('@coya/counter');
const express = require('express');
const logger = require('@coya/logger')(require('../config').logging);
const twig = require('twig');

const config = require('../config');
const converter = new (require('./converter'))(config.markdownFolder, config.postsFolder);

process.on('uncaughtException', logger.error.bind(logger));
process.on('unhandledRejection', logger.error.bind(logger));

// init connection to database
(async () => {
	await Counter.connect(config.dbUrl);
})();

// create the express app
const app = express();
app.use(countVisitors); // homemade middleware for counting visitors
twig.cache(false); // enable the cache prevents refreshing when templates are modified...
app.set('views', config.postsFolder); // define the folder where the views are

// define the server routes
app.get('/', (req, res, next) => res.redirect('/nz'));
app.get('/:postId([a-z0-9/-]+)', async (req, res, next) => {
	const post = await converter.getPost(req.params.postId);
	if (!post) return res.send("Comme tu peux voir, il n'y a rien ici...");

	res.render(config.templatesFolder + 'post.twig', post);
});

// for unit tests, only the express app is required, no need to run the server
if (process.env.NODE_ENV == 'test') module.exports = app;
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
