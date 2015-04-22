module.exports = (grunt)->
  require('jit-grunt') grunt

  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    release:
      options:
        tagName: 'v<%= version %>'
