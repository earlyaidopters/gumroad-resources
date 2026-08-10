# SETUP

Capture your from-zero setup facts here as you run Part A of the Build-It Prompt Pack. Everything later reads from this. If a line is blank, you are not ready to build yet.

## Toolchain
- OS: [mac / windows / linux]
- AWS CLI v2 confirmed (`aws --version`): [ ]
- Node.js 20+ (`node --version`): [ ]
- AWS CDK (`cdk --version`): [ ]
- git installed: [ ]

## Account
- AWS account id: [123456789012]
- Standalone, not an Organizations member: [yes / no]
- Default region: [us-east-1]
- Named CLI profile: [your profile name]
- Credentials method: [IAM Identity Center (SSO) / IAM user access keys]
- Root user has MFA on, and root is not used day to day: [yes]

## Bootstrap
- `cdk bootstrap` done for this account and region: [yes / no]
- `cdk synth` works on an empty app: [yes / no]

## Bedrock model access (granted per region, in the Bedrock console)
- Claude (Opus / Sonnet / Haiku): [granted?]
- Amazon Titan Text Embeddings: [granted?]
- Amazon Nova Sonic (voice, optional): [granted?]
- Stability (images, us-west-2 only, optional): [granted?]
- Open models (Llama / Mistral, optional): [granted?]
- Verified with `list-foundation-models` and a test invoke: [yes / no]

> Part A of the prompt pack fills every line of this in, step by step. Don't move to Part B until it's complete.
