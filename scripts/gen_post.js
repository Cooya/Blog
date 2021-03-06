#!/usr/bin/env node

const fs = require('fs');
const inquirer = require('inquirer');
const logger = require('@coya/logger')(require('../config').logging);
const util = require('util');

const access = util.promisify(fs.access);
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

const config = require('../config');

(async () => {
	const questions = [
		{
			type: 'input',
			name: 'header.title',
			message: 'Post title ?'
		},
		{
			type: 'input',
			name: 'header.subtitle',
			message: 'Post subtitle ?'
		},
		{
			type: 'input',
			name: 'header.picture_widths',
			message: 'Picture widths ?',
			default: [300, 600, 1200, 2400],
			validate: (arr) => {
				arr = !Array.isArray(arr) ? JSON.parse(arr) : arr;
				if (!Array.isArray(arr)) return 'This must be an array of numbers.';
				for (let arrVal of arr) {
					if (!Number.isInteger(arrVal)) return 'This must be an array of numbers.';
				}
				return true;
			}
		},
		{
			type: 'input',
			name: 'header.wallpaper_picture',
			message: 'Wallpaper picture ?'
		},
		{
			type: 'input',
			name: 'header.back_button_url',
			message: 'Back button URL ?',
			default: '/'
		},
		{
			type: 'checkbox',
			name: 'header.extensions',
			message: 'Extensions ?',
			choices: [{name: 'gallery'}, {name: 'map'}, {name: 'tooltip'}]
		},
		{
			type: 'list',
			name: 'pictures_folder_name',
			message: 'Pictures folder ?',
			choices: (await readDir(config.picturesFolder)).filter((val) => {
				return val[0] != '.'; // ignore the ".gitignore" file
			}),
			validate: (val) => {
				if (!val) return 'You need to define a name for the markdown file.';
				return true;
			}
		},
		{
			type: 'input',
			name: 'markdown_filename',
			message: 'Markdown filename ?',
			validate: (val) => {
				if (!val) return 'This parameter is required.';
				return true;
			}
		},
		{
			type: 'confirm',
			name: 'commit',
			message: 'Commit ?',
			default: false
		}
	];

	try {
		const answers = await inquirer.prompt(questions);
		answers.header.pictures_folder_url = '/static/pictures/' + answers.pictures_folder_name + '/';
		logger.debug(answers);

		const picsFolder = config.picturesFolder + answers.pictures_folder_name;
		const mdDestFile = config.markdownFolder + answers.markdown_filename + '.md';
		const header = JSON.stringify(answers.header, null, 4) + '\n\n';

		try {
			await access(mdDestFile);
			logger.error('The markdown file already exists.');
			process.exit(0);
		} catch (e) {}

		if (answers.commit)
			var {confirmation} = await inquirer.prompt({
				type: 'confirm',
				name: 'confirmation',
				message: 'Destination file "' + mdDestFile + '" ok ?',
				default: false
			});
		if (!confirmation) return;

		await writeMarkdown(picsFolder, mdDestFile, header, answers.commit);
	} catch (e) {
		logger.error(e);
	}
})();

async function writeMarkdown(picsFolder, destFile, header, commit = false) {
	const files = (await readDir(picsFolder)).sort((elt1, elt2) => {
		return elt1.match(/[0-9]+/) - elt2.match(/[0-9]+/);
	});
	let picturesList = '';
	await asyncForEach(files, async (fileName) => {
		for (let picWidth of config.pictureWidths) if (fileName.indexOf('-' + picWidth) != -1) return;
		picturesList += '![](' + fileName + ')\n';
	});
	logger.info(header + picturesList);
	logger.info('Destination : ' + destFile);
	if (commit) writeFile(destFile, header + picturesList);
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++) await callback(array[i], i, array);
}
