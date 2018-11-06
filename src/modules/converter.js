const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const util = require('util');

const gallery = require('./gallery_extension');
const tooltip = require('./tooltip_extension');

const fileExists = util.promisify(fs.exists);
const fileStat = util.promisify(fs.stat);
const mkdir = util.promisify(fs.mkdir);
const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = class Converter {
    constructor(srcMarkdownFolder, destHtmlFolder) {
        this.srcMarkdownFolder = srcMarkdownFolder;
        this.destHtmlFolder = destHtmlFolder;
        this.posts = {};
    }

    async getPost(postId) {
        //console.debug(postId);

        // get the post object
        const post = this.posts[postId];
        if (!post)
            return null;
        //console.debug(post);

        // check the save modification date with the current file modification date 
        const lastModificationDate = await getFileLastModificationDate(post.markdown_file_path);
        //console.debug(lastModificationDate, post.last_modification_date);
        if (lastModificationDate.getTime() != post.last_modification_date.getTime())
            await convertFile.call(this, path.dirname(post.markdown_file_path), path.basename(post.markdown_file_path)); // refresh the html file

        return post;
    }

    async convertFiles(srcFolder = this.srcMarkdownFolder) {
        await asyncForEach(await readDir(srcFolder), convertFile.bind(this, srcFolder));
    }
};

async function convertFile(srcFolder, fileName) {
    console.log('Converting file...');
    
    const relativeFolderPath = path.relative(this.srcMarkdownFolder, srcFolder);
    const filePath = path.resolve(srcFolder, fileName);
    let fileContent;
    let index = false;

    if(fileName == 'index') {
        fileContent = await buildIndex.call(this, srcFolder);
        index = true;
        //console.debug(fileContent);
    }
    else if(fileName == 'index.md')
        index = true;
    else if (path.extname(fileName) != '.md') {
        if((await fileStat(filePath)).isDirectory())
            await this.convertFiles(filePath);
        return;
    }
    //console.debug('Converting file "' + fileName + '"...');

    // we create a new post object
    const postId = determinePostId(relativeFolderPath, fileName);
    const post = {
        markdown_file_path: filePath,
        html_file: index ? postId + '/index.html' : postId + '.html'
    };

    // we read the file, extract its header and save it into the post object
    if(!fileContent)
        fileContent = (await readFile(post.markdown_file_path)).toString();
    const postDataAndContent = extractHeaderFromPost(fileContent);
    if (postDataAndContent.header) {
        fileContent = postDataAndContent.content; // file content whithout header
        for (let attr in postDataAndContent.header)
            post[attr] = postDataAndContent.header[attr];
    }
    post.last_modification_date = await getFileLastModificationDate(post.markdown_file_path);

    // and we convert the markdown file to an html file
    const html = createConverter(post).makeHtml(fileContent);
    const destHtmlFilePath = path.resolve(this.destHtmlFolder, post.html_file);
    await ensureDirectoryExistence(destHtmlFilePath);
    await writeFile(destHtmlFilePath, html);

    // save the new post into the posts container
    this.posts[postId] = post;
    console.debug(filePath, '->', destHtmlFilePath);
}

function extractHeaderFromPost(postContent) {
    let header = postContent.match(/{(.|\n)+}\n\n/);
    if (!header || !header[0]) {
        //console.warn('No header found.');
        return {};
    }

    postContent = postContent.substr(header[0].length);

    try {
        return {
            header: JSON.parse(header[0].replace(/\n/g, '')),
            content: postContent
        };
    }
    catch (e) {
        console.error('JSON parse error !')
        return {};
    }
}

async function getFileLastModificationDate(filePath) {
    const stat = await fileStat(filePath);
    return stat.mtime;
}

function createConverter(settings) {
    let options = {
        strikethrough: true,
        extensions: []
    };

    if (settings.enable_gallery) {
        if (!settings.pictures_folder_url)
            throw Error('If gallery enabled, the attribute "pictures_folder_url" must be specified.');
        if (!settings.picture_widths)
            throw Error('If gallery enabled, the attribute "picture_widths" must be specified.');

        options.extensions.push(gallery(settings.pictures_folder_url, settings.picture_widths));
    }
    if(settings.enable_tooltip)
        options.extensions.push(tooltip());

    return new showdown.Converter(options);
}

async function buildIndex(srcFolder) {
    const relativePath = path.relative(this.srcMarkdownFolder, srcFolder);
    const files = await readDir(srcFolder);
    let index = '# Me\n';
    files.forEach((fileName) => {
        if (path.extname(fileName) != '.md')
            return;
        index += `[${fileName.replace('.md', '')}](${relativePath + '/' + fileName.replace('.md', '')})  \n`;
    });
    return index;
}

async function ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if(!(await fileExists(dirname))) {
        ensureDirectoryExistence(dirname);
        await mkdir(dirname);
    }
}

function determinePostId(relativeFolderPath, fileName) {
    if(fileName == 'index' || fileName == 'index.md')
        return relativeFolderPath || '/';
    if(relativeFolderPath)
        return relativeFolderPath + '/' + fileName.replace('.md', '');
    return fileName.replace('.md', '');
}

async function asyncForEach(array, callback) {
	for (let i = 0; i < array.length; i++)
		await callback(array[i], i, array);
}