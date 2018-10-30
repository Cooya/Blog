const fs = require('fs');
const path = require('path');
const showdown = require('showdown');
const util = require('util');

const gallery = require('./gallery_extension');

const readDir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const fileStat = util.promisify(fs.stat);

module.exports = class Converter {
    constructor(srcMarkdownFolder, destHtmlFolder) {
        this.srcMarkdownFolder = srcMarkdownFolder;
        this.destHtmlFolder = destHtmlFolder;
        this.posts = {};
    }

    async getPost(postId) {
        // get the post object
        const post = this.posts[postId];
        if (!post)
            return null;
        //console.debug(post);

        // check the save modification date with the current file modification date 
        const lastModificationDate = await getFileLastModificationDate(post.markdown_file_path);
        //console.debug(lastModificationDate, post.last_modification_date);
        if (lastModificationDate.getTime() != post.last_modification_date.getTime())
            await convertFile.call(this, postId + '.md'); // refresh the html file

        return post;
    }

    async convertFiles() {
        (await readDir(this.srcMarkdownFolder)).forEach(convertFile.bind(this));
    }
};

async function convertFile(fileName) {
    if (path.extname(fileName) != '.md')
        return;
    console.debug('Converting file "' + fileName + '"...');

    // we create a new post object
    const postId = fileName.replace('.md', '');
    const post = { markdown_file_path: this.srcMarkdownFolder + fileName };

    // we read the file, extract its header and save it into the post object
    let fileContent = (await readFile(post.markdown_file_path)).toString();
    const postDataAndContent = extractHeaderFromPost(fileContent);
    if (postDataAndContent.header) {
        fileContent = postDataAndContent.content; // file content whithout header
        for (let attr in postDataAndContent.header)
            post[attr] = postDataAndContent.header[attr];
    }
    post.last_modification_date = await getFileLastModificationDate(post.markdown_file_path);

    // and we convert the markdown file to an html file
    const destHtmlFileName = postId + '.html';
    const html = createConverter(post).makeHtml(fileContent);
    await writeFile(this.destHtmlFolder + destHtmlFileName, html);
    post.html_file = destHtmlFileName;

    // save the new post into the posts container
    this.posts[postId] = post;
}

function extractHeaderFromPost(postContent) {
    let header = postContent.match(/{(.|\n)+}\n\n/);
    if (!header || !header[0]) {
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
    catch (e) {
        console.error('JSON parse error !')
        return {};
    }
}

async function getFileLastModificationDate(filePath) {
    const stat = await fileStat(filePath);
    return stat.mtime;
}

function createConverter(postData) {
    let options = {
        strikethrough: true
    };

    if (postData.enable_gallery) {
        if (!postData.pictures_folder_url)
            throw Error('If gallery enabled, the attribute "pictures_folder_url" must be specified.');
        if (!postData.picture_widths)
            throw Error('If gallery enabled, the attribute "picture_widths" must be specified.');

        options.extensions = [gallery(postData.pictures_folder_url, postData.picture_widths)];
    }

    return new showdown.Converter(options);
}