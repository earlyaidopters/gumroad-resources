# COMMANDS

The exact commands to check each step, copy-paste ready. The prompts run these for you, but keep this handy to verify by hand or debug.

## Identity and region (Part A)
```
aws --version                      # expect aws-cli/2.x
aws sts get-caller-identity        # your account id, and you're authenticated
aws configure list                 # your profile and default region
aws ec2 describe-regions --query "Regions[0].RegionName"   # confirms the CLI works
```

## Toolchain and bootstrap (Part A)
```
node --version                     # expect v20+
cdk --version                      # the AWS CDK is installed
cdk bootstrap aws://ACCOUNT_ID/REGION   # one time per account+region
cdk synth                          # should succeed on an empty app
```

## Bedrock model access (Part A)
```
# List the Claude models available in your region (after granting access in the console):
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId, 'claude')].modelId"
# Titan embeddings:
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?contains(modelId, 'titan-embed')].modelId"
```

## Drafting the build (Part C)
```
cdk ls          # lists your stacks, in dependency order
cdk synth       # turn the code into the AWS template, catch errors early
cdk diff        # see exactly what a change would create or alter
cdk deploy STACK_NAME   # make one stack real (deploy in order, one at a time)
```

## Verify the foundation exists (Part C)
```
aws s3 ls                                  # your buckets
aws s3api get-object-lock-configuration --bucket YOUR_AUDIT_BUCKET   # confirms write-once is on
aws dynamodb list-tables                   # your tables
aws kms list-keys                          # your keys
aws ec2 describe-vpcs --query "Vpcs[].VpcId"   # your VPC exists
```

## Watch the cost (Part C and beyond)
```
aws budgets describe-budgets --account-id ACCOUNT_ID   # your budget is set
# Month-to-date spend by service:
aws ce get-cost-and-usage --time-period Start=2026-06-01,End=2026-06-30 \
  --granularity MONTHLY --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE
```

## A note on teardown
The buckets are set to RETAIN and the audit bucket uses Object Lock on purpose, so `cdk destroy` will not wipe your records. That is a safety feature. If you genuinely want everything gone, you remove those protections deliberately, which is exactly the friction you want around audit data.

Stuck on what a command is telling you? Bring it to the community: https://www.skool.com/earlyaidopters/about
