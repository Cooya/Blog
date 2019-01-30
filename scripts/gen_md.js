#!/usr/bin/env node

const fs = require('fs');
const util = require('util');

const access = util.promisify(fs.access);
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

const config = require('../config');

const header =
	'{\n\
	"title": "",\n\
	"subtitle": "",\n\
	"pictures_folder_url": "/static/pictures/",\n\
	"picture_widths": [300, 600, 1200, 2400],\n\
	"wallpaper_picture": "",\n\
	"back_button_url": "/",\n\
	"extensions": []\n\
}\n\n';

(async () => {
	try {
		const picsFolderName = process.argv[2];
		const mdFileName = process.argv[3];
		let commit = false;
		let arg;
		for (let i = 4; i < process.argv.length; ++i) {
			arg = process.argv[i];
			if (arg == '--commit') commit = true;
		}

		if (!picsFolderName || !mdFileName) {
			console.log('Usage: gen-md <picsFolderName> <mdFileName> [--commit]');
			return;
		}

		const picsFolder = config.staticFolder + 'pictures/' + picsFolderName;
		const mdDestFile = config.markdownFolder + mdFileName + '.md';
		try {
			await access(mdDestFile);
			console.error('The markdown file already exists.');
			process.exit(0);
		} catch (e) {}

		await writeMarkdown(picsFolder, mdDestFile, commit);
	} catch (e) {
		console.error(e);
	}
})();

async function writeMarkdown(picsFolder, destFile, commit = false) {
	const files = (await readDir(picsFolder)).sort((elt1, elt2) => {
		return elt1.match(/[0-9]+/) - elt2.match(/[0-9]+/);
	});
	let picturesList = '';
	await asyncForEach(files, async fileName => {
		for (let picWidth of config.pictureWidths)
			if (fileName.indexOf('-' + picWidth) != -1) return;
		picturesList += '![](' + fileName + ')\n';
	});
	console.log(header + picturesList);
	console.log('Destination : ' + destFile);
	if (commit) writeFile(destFile, header + picturesList);
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++) await callback(array[i], i, array);
}
