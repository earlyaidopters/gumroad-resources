# GLOSSARY

Every term in this kit, in plain English, and what it means in this system. If a prompt or the Blueprint uses a word you don't know, it's here.

## The AWS building blocks
- **AWS account**: your own walled space on Amazon's cloud. Everything in this build lives in one.
- **Region**: which physical part of the world your stuff runs in (e.g. us-east-1). Model access and bootstrap are per region.
- **Bedrock**: Amazon's way of running AI models inside your account, so your prompts never leave it.
- **Fargate**: the always-on engine that runs your agents as containers, with no server for you to manage.
- **DynamoDB**: your database. Fast tables that hold the agent's memory, settings, and records.
- **S3**: your file storage. Buckets for documents, media, and the audit log.
- **KMS**: the key service. Your data is encrypted with keys only you hold.
- **Secrets Manager**: the vault for passwords and tokens, encrypted, never in a plain text file.
- **IAM**: who can do what. It hands each part only the permission for its one job.
- **VPC**: your private network inside AWS, walling the system off from the open internet.
- **NAT gateway**: lets things inside your private network reach out to AWS services. Costs about $33/mo each, and you usually have two.
- **ALB (load balancer)**: the single guarded front door that routes incoming requests in.
- **WAF**: a firewall that filters bad web traffic before it reaches you.
- **GuardDuty**: the threat detector that watches your account for suspicious activity.
- **CloudWatch**: the eyes. Metrics, logs, and alarms so you can see what's happening.
- **SNS**: the alert pipe that sends notifications (like a budget warning) to your email.

## Security terms
- **Least privilege**: every part can do only its one job. No master keys.
- **Kill switch**: a toggle that stops a behavior instantly. This system has 42.
- **Audit trail**: a record of who did what, and when.
- **Object Lock / WORM**: write-once storage. Once written, a record can't be quietly changed or deleted (WORM means write once, read many).
- **DLP (leak scan)**: a check on every reply that catches secrets (keys, tokens, card numbers, SSNs) before anything leaves.
- **Guardrail**: a filter that catches personal info before the model sends it.
- **Fail-closed**: when in doubt, stop. The cost cap fails closed: if it can't tell what you've spent, it halts rather than risk overspending.

## AI and agent terms
- **Agent**: an AI that can use tools and take actions, not just chat.
- **Orchestrator**: the one engine that runs every agent and routes every turn.
- **Chokepoint**: the single function every turn passes through, so every safety check happens in one place.
- **RAG**: letting the agent look things up in your own documents before it answers.
- **Embeddings**: turning documents into a form the agent can search (what Titan does).
- **Inference**: the cost and act of actually calling a model. The variable part of your bill.

## Setup and build terms
- **CLI**: the command line. You control AWS by typing commands instead of clicking the website.
- **SSO / IAM Identity Center**: the safe way to log the CLI in, instead of long-lived access keys.
- **MFA**: a second login factor (a code from your phone). Turn it on for the root user immediately.
- **CDK**: infrastructure as code. You describe your AWS setup in code, and it builds it.
- **bootstrap**: a one-time setup CDK needs per account and region before it can deploy.
- **synth**: CDK turning your code into the AWS template, so you can check it before deploying.
- **diff**: CDK showing you exactly what a change would create or alter before you run it.
- **deploy**: actually making the resources real in your account.
- **stack**: one group of related AWS resources. This build is 15 of them, deployed in order.
- **tier**: how big a deploy is (Hobby, Standard, Pro, Enterprise). It scales the cost and the features.

## Cost and compliance terms
- **Fixed floor**: the always-on cost that runs whether or not a message is sent.
- **Daily cap**: a hard in-app limit on AI spend per day, so the bill can't run away.
- **SOC 2**: an audit of whether you're trustworthy with data, against a set of criteria.
- **HIPAA**: US rules for handling protected health information.
- **BAA**: a Business Associate Agreement, the contract a HIPAA partner signs. (A community/consulting funnel, not something a dashboard provides.)
- **Readiness**: how close you are to a compliance bar. Not the same as a certificate, which only an independent audit gives.

Still stuck on a word? Ask in the community: https://www.skool.com/earlyaidopters/about
