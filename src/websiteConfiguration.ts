export interface WebsiteConfiguration {
    name: string,
    domain?: string,
    ssl?: boolean,
    region?: "EU"|"eu-west-1"|"us-west-1"|"us-west-2"|"ap-south-1"|"ap-southeast-1"|"ap-southeast-2"|"ap-northeast-1"|"sa-east-1"|"cn-north-1"|"eu-central-1"|string;
    profile?: string,
    bucket?: string,
    distributionId?: string,
    distributionDomainName?: string,
    certificateArn?: string
}