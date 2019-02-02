# Blog
Personal blog generated from markup language **Markdown** with [Bulma](https://bulma.io/) CSS templates

## Features
- Markdown to HTML convertion with [Showdown](https://github.com/showdownjs/showdown)
- Showdown plug-in "gallery" to build [lightGallery](https://sachinchoolur.github.io/lightGallery/) gallery of pictures
- Showdown plug-in "tooltip" to build custom tooltips
- Showdown plug-in "map" to build [Leaflet](https://leafletjs.com/) maps with markers and arrows
- JSON header configuration to set up some parameters like title, subtitle, picture widths, wallpaper, extensions, etc

## Aliases to define to make life easier
```bash
alias sync-md='rsync -avu --delete <local_markdown_folder> server.com:<remote_markdown_folder>'
alias sync-pics='rsync -avu --delete <local_pictures_folder> server.com:<pictures_markdown_folder>'
alias deploy-blog='ssh server.com "cd Blog;git pull;forever restart <forever_process_id>"'
```

## Create a new post
1. Fill out the "config.js" file.
2. Import pictures with the command ```import-pics```.
~~~~
Usage: import-pics <srcFolder> <destFolder> <picturesName> [--index NUMBER] [--commit]
~~~~
3. Generate a post with the following interactive command ```gen-post```.
4. Push the pictures to the remote server with the command alias ```sync-pics```.
5. Push the markdown posts to the remote server with the command alias ```sync-md```.
6. Deploy the server if needed (if new markdown file has been created for instance) with the command alias ```deploy-blog```.
