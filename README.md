# SPAJS
SPAJS is a simple tool intended for quick and easy setup of static websites and single page application hosting on your AWS account.

## Features
The tool automates following:
- S3 bucket creation and static website hosting setup
- CloudFront distribution creation with CNAME and SSL configuration
- File versioning and optimization/minification before uploading to S3
- File caching configuration

## Install

```bash
$ npm install @fci/spajs -g
```
*npm is a builtin CLI when you install Node.js - [Installing Node.js with package manager](https://nodejs.org/en/download/package-manager/)*

## Initialization
To initialize website environment use the ```init``` command: 

```
$ spajs init --help

  Usage: init [options] <env>

  initialize site environment

  Options:

    -h, --help                  output usage information
    -d, --site-domain <domain>  site domain
    -p, --profile [profile]     aws profile to use from ~/.aws/credentials file
    -r, --region [region]       aws region to use for site bucket
    -s, --ssl                   setup ssl
```

This command automates most of the steps described in [Setting Up a Static Website Using a Custom Domain](http://docs.aws.amazon.com/AmazonS3/latest/dev/website-hosting-custom-domain-walkthrough.html). For using SSL and CNAME with CloudFront you can find more information [here](http://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-procedures.html).

Env parameter is the name of environment. For example if you are using [GitFlow](http://jeffkreeftmeijer.com/2010/why-arent-you-using-git-flow/) you can have ```dev``` environment for latest code version, ```staging``` for next release QA and ```production``` for current stable release.
When you initialize environment configuration will be save under current directory in ```.spajs/<env>.json```

### Example
Following command creates S3 bucket ```test.foundcenter.com``` in ```eu-central-1``` region, sets up CloudFront distribution for it with custom SSL certificate from AWS Certificate Manager and binds distrubution to CNAME ```test.foundcenter.com```. When using CNAME option make sure that same CNAME is not used for any other distribution. To be able to setup SSL you will need to [create domain certificate using AWS Certificate Manager](http://docs.aws.amazon.com/acm/latest/userguide/gs-acm-request.html).

```
$ spajs init dev -d test16.foundcenter.com -r eu-central-1 -s
```
Output:
```
Creating bucket test16.foundcenter.com in region eu-central-1...
Bucket test16.foundcenter.com created and configured for static website hosting.
Creating CloudFront distribution...
Setting CloudFront distribution domain test16.foundcenter.com...
Setting SSL certificate for domain test16.foundcenter.com...
CloudFront distribution E8LEBN3xxxx created.
Update your DNS settings! You need to set CNAME for domain test16.foundcenter.com to d205dq8zsd4fv.cloudfront.net
```

In order to use you custom domain setup DNS CNAME record to point to newely created CloudFront distribution. In our example ```test16.foundcenter.com``` needs to point to ```d205dq8zsd4fv.cloudfront.net```.

## Deployment
To deploy website content use ```deploy``` command:

```
$ spajs deploy --help

  Usage: deploy [options] <env> [path]

  deploy content to environment

  Options:

    -h, --help  output usage information
```
### Example
```
$ spajs deploy dev
```
Output:
```
[14:10:20] [create] index.html
[14:10:20] [create] page2.html
[14:10:21] [create] css/style1.css
[14:10:23] [create] images/image1.png
[14:10:23] [create] js/app.js
[14:10:23] [create] js/app1.js
[14:10:24] [create] js/dyn.js
[14:10:24] [create] templates/template1.html
[14:10:25] [create] tmp/index.html
[14:10:25] [create] xxx/template1.xxx
[14:10:25] [create] css/style1.70cd6184.css
[14:10:27] [create] images/image1.991d6e1d.png
[14:10:27] [create] js/app.46d6ffa2.js
[14:10:27] [create] js/app1.39a89d88.js
[14:10:28] [create] js/dyn.d050a82d.js
[14:10:28] [create] xxx/template1.9cfdf0d7.xxx
[14:10:29] [update] index.html
[14:10:29] [update] page2.html
[14:10:29] [skip]   templates/template1.html
[14:10:29] [update] tmp/index.html
```

Deploy command first uses [uglify](https://github.com/mishoo/UglifyJS) and [csso](https://github.com/css/csso) to optimize all css and js files than it uses [rev-all](https://github.com/smysnk/gulp-rev-all) to version each file and [awspublish](https://github.com/pgherveou/gulp-awspublish) to push the to AWS S3 bucket.

In order to do caching correctly all files (except .html files) are versioned and aggressively cached ```Cache-Control: max-age=315360000, no-transform, public```. All .html files are not cached ```Cache-Control: no-cache, no-store, must-revalidate```.