# BUILD CHECKLIST

Tick these off as you go. It mirrors the Build-It Prompt Pack. If everything here is checked, you have a real, costed, deployed foundation in your own AWS.

## Part A, Set up your AWS (from nothing)
- [ ] AWS CLI v2 installed (`aws --version`)
- [ ] A standalone AWS account (not an Organizations member), root protected with MFA
- [ ] A non-root profile and a default region set (`aws sts get-caller-identity` works)
- [ ] Node 20+, git, and the AWS CDK installed (`cdk --version`)
- [ ] A project folder with a .gitignore (node_modules, cdk.out, .env)
- [ ] `cdk bootstrap` done for your account and region
- [ ] `cdk synth` works on an empty app
- [ ] Bedrock model access granted (Claude + Titan at least), verified with a test invoke
- [ ] SETUP.md filled in, no blank lines

## Part B, Plan it (against the Blueprint)
- [ ] BLUEPRINT.md and the specs/ folder copied into your working folder
- [ ] SYSTEM_SPEC.md written, with a recommended tier and your non-negotiables
- [ ] ARCHITECTURE_SPEC.md written, with the secure-substitute map and the ordered stack list
- [ ] COST_SPEC.md written, the two-number split, the watch-list, a daily cap
- [ ] READINESS.md written, the five control categories, with the disclaimer

## Part C, Draft, deploy, and prove the foundation
- [ ] CDK project scaffolded, one stack file per stack, `cdk synth` passes
- [ ] Foundation stacks drafted (Network, Storage incl. write-once audit, Data, Secrets/KMS, IAM)
- [ ] Reviewed `cdk diff` for each, no secrets in code, no wildcard IAM
- [ ] AWS Budget and the daily cap set BEFORE deploying
- [ ] Foundation deployed in dependency order
- [ ] Verified: buckets (audit bucket has Object Lock), tables, keys, VPC all exist
- [ ] Real cost checked against your COST_SPEC estimate
- [ ] Proved the loop: one secure Bedrock call that wrote its own audit record (reply and log both seen)

## You're done with the foundation
The cheap, safe base is real and yours, and you've made a secure AI call in your own cloud and watched it log itself. The next layer, the orchestrator, the agents, the chat surfaces, Jarvis, the dashboard, and the hardened production version, lives in the community, along with the coaching to get there.

**Join here:** https://www.skool.com/earlyaidopters/about
