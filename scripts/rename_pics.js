#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const util = require('util');

const dateformat = require('dateformat');
const exif = require('exif-reader');
const sharp = require('sharp');

const readDir = util.promisify(fs.readdir);
const rename = util.promisify(fs.rename);

const CURRENT_FOLDER = '.';

(async () => {
	const files = await readDir(CURRENT_FOLDER);
	await asyncForEach(files, async (fileName) => {
		let extension = path.extname(fileName).toLowerCase();
		if (['.jpg', '.jpeg', '.png'].indexOf(extension) == -1) {
			//console.warn('File "' + fileName + '" ignored.');
			return;
		}

		let filePath = path.resolve(CURRENT_FOLDER, fileName);
		let metadata = await sharp(filePath).metadata();
		if (metadata.exif) {
			let exifData = exif(metadata.exif);
			if (exifData.image.ModifyDate) {
				//console.debug(exifData.image.ModifyDate);
				let newFilePath = path.resolve(CURRENT_FOLDER, convertDate(exifData.image.ModifyDate) + extension);
				await rename(filePath, newFilePath);
				console.log(newFilePath);
			}
		}
	});
})();

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++) await callback(array[i], i, array);
}

function convertDate(date) {
	return dateformat(new Date(date), 'yyyy-mm-dd HH:MM:ss', true);
}
