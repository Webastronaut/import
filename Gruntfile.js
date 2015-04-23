module.exports = function(grunt) {
	var path = require('path');

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
		concat: {
			basket: {
				src: ['dev/rsvp-latest.min.js', 'dev/basket.js'],
				dest: 'dist/basket.full.custom.min.js'
			},
            import: {
                src: ['dev/jquery.import.js'],
                dest: 'dist/jquery.import.min.js'
            }
		},
        minified : {
            files: {
                src: [
                    'dist/*.js'
                ],
                dest: 'dist/'
            },
            options : {
                sourcemap: false,
                ext : '.js'
            }
        },
        watch : {
            scripts : {
                files : [
                    'dev/*.js'
                ],
                tasks : ['concat']
            }
        },
        browserSync: {
            files: {
                src : [
                    'dist/*.js',
                    'dist/*.html'
                ]
            },
            options: {
                watchTask : true,
                open: 'external',
                tunnel: true,
                server: {
                   	baseDir: path.resolve(process.cwd(), ''),
                    index: 'example/index.html'
                },
                ghostMode: {
                    scroll: false,
                    links: false,
                    forms: false
                }
            }
        }
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-minified');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browser-sync');

    // Tasks
    grunt.registerTask('default', ['concat', 'minified']);
    grunt.registerTask('sync', ['browserSync', 'watch']);
};
