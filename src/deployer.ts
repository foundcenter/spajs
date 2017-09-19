import * as gulp from 'gulp'
import * as rev from 'gulp-rev'
import * as revReplace from 'gulp-rev-replace'
import * as useref from 'gulp-useref'
import * as filter from 'gulp-filter'
import * as uglify from 'gulp-uglify'
import * as csso from 'gulp-csso'
import * as filelog from 'gulp-filelog'
import * as del from 'del'
import * as revCssUrl from 'gulp-rev-css-url'
import * as imagemin from 'gulp-imagemin'
import * as awspublish from 'gulp-awspublish'
import { DeployConfiguration } from './deployConfiguration'
import * as AWS from 'aws-sdk'

var RevAll = require('gulp-rev-all');
var gulpsync = require('gulp-sync')(gulp);
var path = require('path');

export class Deployer {
    public static async deploy(config: DeployConfiguration) {

        var srcFolder = config.inputPath;
        var distFolder = '.tmp/';
        var cacheFolder = `${distFolder}cache/`;

        var awsConfig = {
            "params": {
                "Bucket": config.bucket
            },
            "credentials": new AWS.SharedIniFileCredentials({ profile: config.profile }),
            "signatureVersion": "v4"
        }

        var publisher = awspublish.create(awsConfig);

        var noCacheHeaders = {
            'Cache-Control': 'no-cache, no-store, must-revalidate'
        };

        var cacheHeaders = {
            'Cache-Control': 'max-age=315360000, no-transform, public'
        };

        gulp.task("clean", function () {
            return del([distFolder], { force: true });
        });

        gulp.task("copy", function () {
            return gulp.src(["**"], { cwd: srcFolder })
                .pipe(gulp.dest(distFolder));
        });

        gulp.task("min", function () {
            let imagesFilter = filter('**/*.{jpg,jpeg,gif,png,bmp,svg}', { restore: true });
            let jsFilter = filter('**/*.js', { restore: true });
            let cssFilter = filter('**/*.css', { restore: true });

            return gulp.src(`**`, { cwd: distFolder })
                .pipe(jsFilter)
                .pipe(uglify({ mangle: false }))
                .pipe(jsFilter.restore)
                .pipe(cssFilter)
                .pipe(csso())
                .pipe(cssFilter.restore)
                .pipe(gulp.dest(distFolder))
        });

        gulp.task('rev-all', function () {
            let dontRenameFile = [/^\/favicon.ico$/g, '.html'];

            let p = gulp.src(`${distFolder}/**`)

            if (config.rev) {
                p = p.pipe(RevAll.revision({
                    dontRenameFile: dontRenameFile
                }));
            }

            return p.pipe(gulp.dest(cacheFolder))
        });

        gulp.task('publish', function () {
            return gulp.src(['**', '!cache/**'], { cwd: distFolder })
                .pipe(awspublish.gzip())
                .pipe(publisher.publish(noCacheHeaders))
                .pipe(awspublish.reporter());
        });

        gulp.task('publish-cache', function () {
            return gulp.src(['cache/**', '!cache/**/*.html', '!cache/favicon.ico'], { cwd: distFolder })
                .pipe(awspublish.gzip())
                .pipe(publisher.publish(cacheHeaders))
                .pipe(awspublish.reporter());
        });

        gulp.task('publish-cache-updates', function () {
            return gulp.src(['cache/**/*.html', 'cache/favicon.ico'], { cwd: distFolder })
                .pipe(awspublish.gzip())
                .pipe(publisher.publish(noCacheHeaders))
                .pipe(awspublish.reporter());
        });

        gulp.task("prepare", gulpsync.sync(["clean", "copy", "min", "rev-all", "publish", "publish-cache", "publish-cache-updates"]));

        await gulp.start('prepare');

    }
}