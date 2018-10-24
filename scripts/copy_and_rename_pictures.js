const fs = require('fs');
const path = require('path');
const util = require('util');

const copyFile = util.promisify(fs.copyFile);
const fileExists = util.promisify(fs.exists);
const readDir = util.promisify(fs.readdir);

(async () => {
	try {
		let srcFolder = process.argv[2];
		let destFolder = process.argv[3];
		let picturesName = process.argv[4];

		if(!srcFolder || !destFolder) {
			console.log('Usage: node scripts/copy_and_rename_pictures srcFolder destFolder [picturesName]');
			return;
		}

		await copyPictures(srcFolder, destFolder, picturesName);
	}
	catch (e) {
		console.error(e);
	}
})();

async function copyPictures(srcFolder, destFolder, picturesName = 'img') {
	const files = await readDir(srcFolder);
	let i = 1;
	await asyncForEach(files, async (fileName) => {
		let extension = path.extname(fileName);
		if (['.jpg', '.jpeg', '.png'].indexOf(extension) == -1) {
			console.warn('File "' + fileName + '" ignored.');
			return;
		}

		let destFile = path.resolve(destFolder, picturesName + (i++) + extension);
		while (await fileExists(destFile))
			destFile = path.resolve(destFolder, picturesName + (i++) + extension)

		await copyFile(path.resolve(srcFolder, fileName), destFile);
		console.log('Picture "' + fileName + '" copied successfully as "' + path.basename(destFile) + '".');
	});
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++)
		await callback(array[i], i, array);
}