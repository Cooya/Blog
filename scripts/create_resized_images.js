const fs = require('fs');
const path = require('path');
const util = require('util');

const sharp = require('sharp');

const writeFile = util.promisify(fs.writeFile);
const readDir = util.promisify(fs.readdir);

(async () => {
	try {
		let srcFolder = process.argv[2];
		let commit = process.argv.indexOf('--commit') != -1;
		const widths = ['thumbnail', 300, 600, 1200, 2400];

		if(!srcFolder) {
			console.log('Usage: node scripts/create_resized_images srcFolder [--commit]');
			return;
		}

		await resizePictures(srcFolder, widths, commit);
	}
	catch (e) {
		console.error(e);
	}
})();

async function resizePictures(srcFolder, widths, commit = false) {
	const files = await readDir(srcFolder);
	await asyncForEach(files, async (fileName) => {
		let extension = path.extname(fileName);
		if (['.jpg', '.jpeg', '.png'].indexOf(extension) == -1 || fileName.match(/-([0-9]{3,4}|thumbnail)\./)) {
			console.warn('File "' + fileName + '" ignored.');
			return;
		}

		let originalFile = path.resolve(srcFolder, fileName);
		let image;
		let metadata;
		let data
		let destFile;
		for(let width of widths) {
			image = sharp(originalFile);
			metadata = await image.metadata();	
			if(width == 'thumbnail')
				data = await image.resize({width: Math.round(metadata.width * 0.1), height: metadata.height * 0.1}).toBuffer();
			if(metadata.width < width)
				data = await image.toBuffer();
			else
				data = await image.resize({width: width, height: metadata.height * (width / metadata.width)}).toBuffer();
			destFile = path.resolve(srcFolder, fileName.replace(extension, '') + '-' + width + extension);
			if(commit)
				await writeFile(destFile, data);
			console.log('File ' + destFile + ' created successfully.');
		}
	});
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++)
		await callback(array[i], i, array);
}