# TROUBLESHOOTING

The snags that stop most people, and the fix for each. If Claude Code hits one of these mid-prompt, paste the relevant fix.

## "Unable to locate credentials" / get-caller-identity fails
Your CLI isn't authenticated yet. Run `aws configure sso` (preferred) or `aws configure` with an IAM user's access keys. Then re-run `aws sts get-caller-identity`. Never use root access keys.

## "unsupported-account-profile" or the account is an Organizations member
This path needs a standalone account. A company account, or one managed under AWS Organizations, often can't be used. Open a fresh standalone account just for this build, turn on MFA for root, and create a non-root admin for daily work.

## cdk bootstrap fails
Make sure you're using admin-level credentials and that you bootstrapped the right account and region: `cdk bootstrap aws://ACCOUNT_ID/REGION`. Bootstrap is per account and per region, so if you later deploy to a new region, bootstrap that one too.

## Bedrock "AccessDeniedException" or a model isn't found
Model access is granted per account, per region, in the Bedrock console under Model access, and can take a few minutes to propagate. Request the models you need, wait, then re-check with `aws bedrock list-foundation-models`. The Stability image model is us-west-2 only.

## cdk synth complains about account or region
Set them explicitly: export `CDK_DEFAULT_ACCOUNT` and `CDK_DEFAULT_REGION`, or pin `env` in your stack definitions. Re-run `cdk synth`.

## Node or CDK version errors
Use Node 20 LTS (not the newest release). Reinstall the CDK with `npm install -g aws-cdk` and confirm `cdk --version`.

## The bill is higher than I expected
Check three things. You likely have 2 NAT gateways (about $33/mo each), which dominate a small deploy. Confirm VPC interface endpoints are OFF (they run about $175/mo for the full set). And make sure you set the AWS Budget and the daily cap BEFORE deploying, not after. See COST_SPEC.md.

## I can't empty or delete the audit bucket
That's on purpose. The audit bucket uses S3 Object Lock (write-once), so it intentionally resists deletion until its retention expires. The buckets are also set to RETAIN on teardown so a bad `cdk destroy` can't wipe your records. This is a feature, not a bug.

## Claude Code says it can't find BLUEPRINT.md or the specs
Copy BLUEPRINT.md and the specs/ folder from this kit into the working folder you opened Claude Code in. The prompts read them from there.

## Still stuck
The full reference build and hands-on coaching to get past anything here live in the community: https://www.skool.com/earlyaidopters/about
