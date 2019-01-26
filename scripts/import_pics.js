#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const util = require('util');

const access = util.promisify(fs.access);
const copyFile = util.promisify(fs.copyFile);
const fileExists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);
const readDir = util.promisify(fs.readdir);
const writeFile = util.promisify(fs.writeFile);

const config = require('../config');

(async () => {
	try {
		let srcFolder = process.argv[2];
		let destFolder = process.argv[3];
		let picturesName = process.argv[4];
		let index = 1;
		let commit = false;
		let arg;
		for (let i = 5; i < process.argv.length; ++i) {
			arg = process.argv[i];
			if (arg == '--index') index = process.argv[i + 1];
			else if (arg == '--commit') commit = true;
		}

		if (!srcFolder || !destFolder || !picturesName) {
			console.log(
				'Usage: import-pics <srcFolder> <destFolder> <picturesName> [--index NUMBER] [--commit]'
			);
			return;
		}

		try {
			await access(destFolder);
		} catch (e) {
			await mkdir(destFolder);
		}

		await copyPictures(srcFolder, destFolder, picturesName, index, commit);
		await resizePictures(!commit ? srcFolder : destFolder, config.pictureWidths, commit);
	} catch (e) {
		console.error(e);
	}
})();

async function copyPictures(srcFolder, destFolder, picturesName, index = 1, commit = false) {
	const files = await readDir(srcFolder);
	await asyncForEach(files, async fileName => {
		let extension = path.extname(fileName);
		if (['.jpg', '.jpeg', '.png'].indexOf(extension) == -1) {
			console.warn('File "' + fileName + '" ignored.');
			return;
		}

		let destFile = path.resolve(destFolder, picturesName + index++ + extension);
		while (await fileExists(destFile))
			destFile = path.resolve(destFolder, picturesName + index++ + extension);

		if (commit) await copyFile(path.resolve(srcFolder, fileName), destFile);
		console.log(
			'Picture "' + fileName + '" copied successfully as "' + path.basename(destFile) + '".'
		);
	});
}

async function resizePictures(srcFolder, widths, commit = false) {
	const files = await readDir(srcFolder);
	await asyncForEach(files, async fileName => {
		let extension = path.extname(fileName);
		if (
			['.jpg', '.jpeg', '.png'].indexOf(extension) == -1 ||
			fileName.match(/-([0-9]{3,4}|thumbnail)\./)
		) {
			//console.warn('File "' + fileName + '" ignored.');
			return;
		}

		let originalFile = path.resolve(srcFolder, fileName);
		let image;
		let metadata;
		let data;
		let destFile;
		let newFileName;
		for (let width of widths) {
			// determine new file and check if it already exists or not
			newFileName = fileName.replace(extension, '') + '-' + width + extension;
			destFile = path.resolve(srcFolder, newFileName);
			if (await fileExists(destFile)) {
				//console.log('File ' + newFileName + ' already exists.');
				continue;
			}

			// rotate and resize the image
			image = sharp(originalFile);
			metadata = await image.metadata();
			if (width == 'thumbnail')
				data = await image
					.rotate()
					.resize({
						width: Math.round(metadata.width * 0.1),
						height: metadata.height * 0.1
					})
					.toBuffer();
			if (metadata.width < width) data = await image.toBuffer();
			else
				data = await image
					.rotate()
					.resize({ width: width, height: metadata.height * (width / metadata.width) })
					.toBuffer();

			// create the file if commit is specified
			if (commit) await writeFile(destFile, data);
			console.log('File ' + destFile + ' created successfully.');
		}
	});
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++) await callback(array[i], i, array);
}
