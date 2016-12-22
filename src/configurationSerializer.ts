import { WebsiteConfiguration } from './websiteConfiguration'
import * as path from 'path'
import * as mkdirp from 'mkdirp'
let promisify = require('promisify-node');
let fs = promisify('fs');

export class ConfigurationSerializer {
    static async save(config: WebsiteConfiguration, dir: string) {
        if (!config.name) {
            throw new Error('Website configuration name not specified.');
        }
        
        let configDir = path.join(dir, '.spajs');
        let configPath = path.join(configDir, `${config.name}.json`)

        await ConfigurationSerializer.mkdirp(configDir)

        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }

    static async load(name: string, dir: string) {
        if (!name) {
            throw new Error('Website configuration name not specified.');
        }

        let configPath = path.join(dir, '.spajs', `${name}.json`);

        var content = await fs.readFile(configPath);

        var config: WebsiteConfiguration = JSON.parse(content);

        return config;
    }

    static mkdirp(dir, opts?) {
        return new Promise((resolve, reject) => {
            mkdirp(dir, opts, (err, made) => err === null ? resolve(made) : reject(err))
        })
    }
}