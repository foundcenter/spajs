#!/usr/bin/env node

import * as program from 'commander'
import { WebsiteConfiguration } from './websiteConfiguration'
import { DeployConfiguration } from './deployConfiguration'
import { Initializer } from './initializer'
import { Deployer } from './deployer'
import { ConfigurationSerializer } from './configurationSerializer'

program.version('0.0.2')

program.command('init <env>')
    .description('initialize site environment')
    .option('-d, --site-domain <domain>', 'site domain')
    .option('-p, --profile [profile]', 'aws profile to use from ~/.aws/credentials file', 'default')
    .option('-r, --region [region]', 'aws region to use for site bucket', 'eu-west-1')
    .option('-s, --ssl', 'setup ssl', true)
    .action(function (env, options) {
        let config: WebsiteConfiguration = {
            name: env,
            domain: options.siteDomain,
            ssl: !!options.ssl,
            region: options.region,
            profile: options.profile
        }

        Initializer.init(config).then((initConfig) => {
            ConfigurationSerializer.save(initConfig, process.cwd())
        });
    });

program.command('deploy <env> [path]')
    .description('deploy content to environment')
    .action(function (env, path, options) {
        ConfigurationSerializer.load(env, process.cwd()).then((config) => {
            Deployer.deploy({
                bucket: config.bucket,
                profile: config.profile,
                inputPath: path || process.cwd()
            });
        });
    });

program.parse(process.argv);

if (!program.args.length) {
    program.help();
}