module.exports = function(grunt) {
	require('google-closure-compiler').grunt(grunt, ['-Xms2048m']);
    var revision="unknown", defaultConfig, packageFile;
	var path = grunt.option('src') || './configs';
	var level = grunt.option('level') || 'ADVANCED';
	var formatting = grunt.option('formatting') || '';
	var nomap = grunt.option('nomap') || '';
	
	grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-replace');
	
	grunt.registerTask('build_webword_init', 'Initialize build WebWord SDK.', function(){
        defaultConfig = path + '/webword.json';
        packageFile = require(defaultConfig);

        if (packageFile)
            grunt.log.ok('WebWord config loaded successfully'.green);
        else
            grunt.log.error().writeln('Could not load config file'.red);
    });

	grunt.registerTask('build_nativeword_init', 'Initialize build NativeWord SDK.', function(){
        defaultConfig = path + '/nativeword.json';
        packageFile = require(defaultConfig);

        if (packageFile)
            grunt.log.ok('nativeword config loaded successfully'.green);
        else
            grunt.log.error().writeln('Could not load config file'.red);
    });
	
    grunt.registerTask('build_webexcel_init', 'Initialize build WebExcel SDK.', function(){
        defaultConfig = path + '/webexcel.json';
        packageFile = require(defaultConfig);

        if (packageFile)
            grunt.log.ok('WebExcel config loaded successfully'.green);
        else
            grunt.log.error().writeln('Could not load config file'.red);
    });

    grunt.registerTask('build_webpowerpoint_init', 'Initialize build WebPowerPoint SDK.', function(){
        defaultConfig = path + '/webpowerpoint.json';
        packageFile = require(defaultConfig);

        if (packageFile)
            grunt.log.ok('WebPowerPoint config loaded successfully'.green);
        else
            grunt.log.error().writeln('Could not load config file'.red);
    });
	
	grunt.registerTask('build_sdk', 'Build sdk.', function(){
        if (packageFile) {
            if (packageFile['tasks']['build'])
                grunt.task.run(packageFile['tasks']['build']);
            else
                grunt.log.error().writeln('Not found "build" task in configure'.red);
        } else {
            grunt.log.error().writeln('Is not load configure file.'.red);
        }
    });
	
	grunt.registerTask('build_webword',     ['build_webword_init', 'build_sdk']);
	grunt.registerTask('build_nativeword', ['build_nativeword_init', 'build_sdk']);
    grunt.registerTask('build_webexcel',  ['build_webexcel_init', 'build_sdk']);
    grunt.registerTask('build_webpowerpoint', ['build_webpowerpoint_init', 'build_sdk']);
		
	grunt.registerTask('build_all', ['build_webword_init', 'build_sdk', 'build_webexcel_init', 'build_sdk', 'build_webpowerpoint_init', 'build_sdk']);

	grunt.registerTask('up_sdk_src_init', 'Update SDK source', function() {
		grunt.initConfig({
			exec: {
				update_sources: {
					command: 'svn.exe up -q --non-interactive -r ' + packageFile['update_src']['revision'] + ' ' + packageFile['update_src']['src'],
					stdout: true
				},				
				update_logs: {
					command: 'svn.exe up -q --non-interactive -r HEAD ' + packageFile['compile']['sdk']['log'],
					stdout: true
				}
			}
		});
    });
	
	grunt.registerTask('update_sources_webword', ['build_webword_init', 'up_sdk_src_init', 'exec']);
	grunt.registerTask('update_sources_webexcel', ['build_webexcel_init', 'up_sdk_src_init', 'exec']);
	grunt.registerTask('update_sources_webpowerpoint', ['build_webpowerpoint_init', 'up_sdk_src_init', 'exec']);

	grunt.registerTask('update_sources', ['update_sources_webword', 'update_sources_webexcel', 'update_sources_webpowerpoint']);
		
  grunt.registerTask('add_build_number', function() {
		var pkg = grunt.file.readJSON(defaultConfig);

		if(undefined !== process.env['BUILD_NUMBER']) {
			grunt.log.ok('Use Jenkins build number as sdk-all build number!'.yellow);
			packageFile['info']['build'] = parseInt(process.env['BUILD_NUMBER']);
			pkg.info.build = packageFile['info']['build'];
      packageFile['info']['rev'] = process.env['SVN_REVISION'] || revision;
      grunt.file.write(defaultConfig, JSON.stringify(pkg, null, 4));    
		}
  });
    
    grunt.registerTask('increment_build', function() {
		var pkg = grunt.file.readJSON(defaultConfig);
		pkg.info.build = parseInt(pkg.info.build) + 1;
		packageFile['info']['rev'] = process.env['SVN_REVISION'] || revision;
		grunt.file.write(defaultConfig, JSON.stringify(pkg, null, 4));
    });
	
	grunt.registerTask('compile_sdk_init', function(compilation_level) {
		grunt.file.mkdir( packageFile['compile']['sdk']['log'] );
		var srcFiles = packageFile['compile']['sdk']['common'];
		var sdkOpt = {
			compilation_level: compilation_level,
			warning_level: 'QUIET',
			externs: packageFile['compile']['sdk']['externs']
		};
		if (formatting) {
			sdkOpt['formatting'] = formatting;
		}
		if (!nomap) {
			sdkOpt['variable_renaming_report'] = packageFile['compile']['sdk']['log'] + '/variable.map';
			sdkOpt['property_renaming_report'] = packageFile['compile']['sdk']['log'] + '/property.map';
		}		
		
		if (grunt.option('mobile')) {				
			var excludeFiles = packageFile['compile']['sdk']['exclude_mobile']
			srcFiles = srcFiles.filter(function(item) {
				return -1 === excludeFiles.indexOf(item);
			});		
			var mobileFiles = packageFile['compile']['sdk']['mobile'];
			if(mobileFiles){
				srcFiles = mobileFiles.concat(srcFiles);
			}
		}
		
		if (!grunt.option('noprivate')) {
			srcFiles = srcFiles.concat(packageFile['compile']['sdk']['private']);
		}
		if (grunt.option('desktop')) {
			srcFiles = srcFiles.concat(packageFile['compile']['sdk']['desktop']);
		}
	
		grunt.initConfig({
			pkg: packageFile,
			'closure-compiler': {
				sdk: {
					files: {
						'<%= pkg.compile.sdk.dst %>': srcFiles
					},
					options: sdkOpt
				}
			},
			concat: {
				options: {
					banner: '(function(window, undefined) {',
					footer: '})(window);'
					},
				dist: {
					src: ['<%= pkg.compile.sdk.dst %>'],
					dest: '<%= pkg.compile.sdk.dst %>'
					}
			},
			replace: {
				version: {
					options: {
						variables: {
							Version: packageFile['info']['version'],
							Build: packageFile['info']['build'].toString(),
							Rev: (packageFile['info']['rev'] || 1).toString()
						}
					},
					files: {
						'<%= pkg.compile.sdk.dst %>': '<%= pkg.compile.sdk.dst %>'
					}
				}
			}
		});
	});
	
	grunt.registerTask('compile_sdk', ['compile_sdk_init:' + level, 'closure-compiler', 'concat', 'replace']);
	grunt.registerTask('compile_sdk_native', ['compile_sdk_init:' + level, 'closure-compiler:sdk', 'concat', 'replace']);
		
	grunt.registerTask('default', ['build_all']);
};