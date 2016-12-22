import * as AWS from 'aws-sdk'
import { WebsiteConfiguration } from './websiteConfiguration'

export class Initializer {
    static async createBucket(name: string, region: string) {
        var s3 = new AWS.S3();

        if (!await Initializer.bucketExists(name)) {
            // Create bucket
            var createBucketParams: AWS.S3.Types.CreateBucketRequest = {
                Bucket: name,
                CreateBucketConfiguration: {
                    LocationConstraint: region
                }
            }

            await s3.createBucket(createBucketParams).promise();
        }

        // Set as website
        var putBucketWebsiteParams: AWS.S3.Types.PutBucketWebsiteRequest = {
            Bucket: name,
            WebsiteConfiguration: {
                IndexDocument: {
                    Suffix: "index.html"
                }
            }
        }

        await s3.putBucketWebsite(putBucketWebsiteParams).promise();

        // Configure bucket policy
        var putBucketPolicyParams: AWS.S3.Types.PutBucketPolicyRequest = {
            Bucket: name,
            Policy: `{
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": "arn:aws:s3:::${name}/*"
                        }
                    ]
                }`
        }

        await s3.putBucketPolicy(putBucketPolicyParams).promise();
    }

    static async bucketExists(name): Promise<boolean> {
        var s3 = new AWS.S3();

        try {
            await s3.listObjects({
                Bucket: name
            }).promise();
            return true;
        }
        catch (e) {
            if (e.code == 'NoSuchBucket') {
                return false;
            }
            throw e;
        }
    }

    static createDistributionConfig(bucket: string) {
        var originId = `S3-${bucket}`;

        var config: AWS.CloudFront.Types.DistributionConfig = { /* required */
            CallerReference: Date.now().toString(), /* required */
            Comment: `Distribution for website ${bucket}`, /* required */
            DefaultCacheBehavior: { /* required */
                ForwardedValues: { /* required */
                    Cookies: { /* required */
                        Forward: 'all', /* required */
                    },
                    QueryString: true /* required */
                },
                MinTTL: 0, /* required */
                TargetOriginId: originId, /* required */
                TrustedSigners: { /* required */
                    Enabled: false, /* required */
                    Quantity: 0 /* required */
                },
                ViewerProtocolPolicy: 'allow-all', // | https-only | redirect-to-https', /* required */
                AllowedMethods: {
                    Items: [ /* required */
                        'GET',
                        'HEAD'
                        /* more items */
                    ],
                    Quantity: 2, /* required */
                    CachedMethods: {
                        Items: [ /* required */
                            'GET',
                            'HEAD'
                            /* more items */
                        ],
                        Quantity: 2 /* required */
                    }
                },
                Compress: true,
                DefaultTTL: 86400,
                MaxTTL: 31536000
            },
            Enabled: true, /* required */
            Origins: { /* required */
                Quantity: 1, /* required */
                Items: [
                    {
                        DomainName: `${bucket}.s3.amazonaws.com`, /* required */
                        Id: originId, /* required */
                        S3OriginConfig: {
                            OriginAccessIdentity: ""
                        }
                    }
                    /* more items */
                ]
            },
            Aliases: {
                Quantity: 1,
                Items: [
                    bucket
                ]
            },
            CustomErrorResponses: {
                Quantity: 1, /* required */
                Items: [
                    {
                        ErrorCode: 403, /* required */
                        ErrorCachingMinTTL: 0,
                        ResponseCode: '200',
                        ResponsePagePath: '/index.html'
                    },
                    /* more items */
                ]
            },
            DefaultRootObject: 'index.html',
            HttpVersion: 'http2'
        };

        return config;
    }

    static async createDistribution(config: AWS.CloudFront.Types.DistributionConfig) {
        let cloudfront = new AWS.CloudFront();
        let result = await cloudfront.createDistribution({ DistributionConfig: config }).promise();
        return result;
    }

    static async getDistribution(id: string) {
        var cloudfront = new AWS.CloudFront();
        var result = await cloudfront.getDistribution({ Id: id }).promise();

        return result;
    }

    static async listCertificates() {
        var acm = new AWS.ACM({ region: "us-east-1" });
        var result = await acm.listCertificates({ CertificateStatuses: ["ISSUED"] }).promise();
        return result;
    }

    static setDistributionAlias(config: AWS.CloudFront.Types.DistributionConfig, alias: string) {
        config.Aliases.Items = [alias];
        config.Aliases.Quantity = 1;
        return config;
    }

    static setDistributionSSL(config: AWS.CloudFront.Types.DistributionConfig, certicateArn: string) {

        config.DefaultCacheBehavior.ViewerProtocolPolicy = 'redirect-to-https'

        config.ViewerCertificate = {
            ACMCertificateArn: certicateArn,
            SSLSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1'
        }

        return config;
    }

    static async getDomainCertificate(domain: string) {
        let certificates = await Initializer.listCertificates();
        let domainCertificate = certificates.CertificateSummaryList.find(c => domain.indexOf(c.DomainName) > -1);
        return domainCertificate;
    }

    static async init(config: WebsiteConfiguration) {
        try {
            var credentials = new AWS.SharedIniFileCredentials({ profile: config.profile });
            AWS.config.credentials = credentials;
            AWS.config.update({
                signatureVersion: 'v4'
            });

            let bucket = config.domain;
            console.log(`Creating bucket ${bucket} in region ${config.region}...`);
            await Initializer.createBucket(bucket, config.region);
            console.log(`Bucket ${bucket} created and configured for static website hosting.`);

            console.log("Creating CloudFront distribution...")
            let distributionConfig = Initializer.createDistributionConfig(bucket);

            if (config.domain) {
                console.log(`Setting CloudFront distribution domain ${config.domain}...`);
                distributionConfig = Initializer.setDistributionAlias(distributionConfig, config.domain)

                if (config.ssl) {
                    console.log(`Setting SSL certificate for domain ${config.domain}...`)
                    let certificate = await Initializer.getDomainCertificate(config.domain);
                    if (!certificate) {
                        throw new Error(`Certificate for ${config.domain} not found. Please add domain certificate in AWS Certifcate Manager.`);
                    }
                    distributionConfig = Initializer.setDistributionSSL(distributionConfig, certificate.CertificateArn);
                    config.certificateArn = certificate.CertificateArn;
                }
            }

            let distributionResult = await Initializer.createDistribution(distributionConfig);
            console.log(`CloudFront distribution ${distributionResult.Distribution.Id} created.`);
            config.distributionId = distributionResult.Distribution.Id;
            config.distributionDomainName = distributionResult.Distribution.DomainName;
            config.bucket = bucket;

            if (config.domain) {
                console.warn(`Update your DNS settings! You need to set CNAME for domain ${config.domain} to ${distributionResult.Distribution.DomainName}`);
            }
            else {
                console.log(`You can access your site on ${distributionResult.Distribution.DomainName}.`);
            }

            return config;
        }
        catch (e) {
            console.error(e);
        }
    }
}