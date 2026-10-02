# Demo Store

A fictional, read-only learning project for Claude Code mods. It sketches a login form, validation, a session and tokens. It is not a production authentication system and contains no real accounts or credentials. No package installation is needed to read the files. Ask Claude to create reports under demo-output/ using new names.

The server port is in config/config.json; src/server.ts reads that file. The login path starts in src/ui/LoginForm.tsx and calls src/auth/login.ts, which uses session.ts and tokens.ts. tests/login.test.ts describes example expectations; it is an illustrative test file, not a configured runnable app.
