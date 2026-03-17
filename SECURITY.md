# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.4.x   | Yes       |
| < 3.4   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, email **security@vp365.ai** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if any)

You will receive an acknowledgement within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Security Design

This control is designed with security in mind:

- **No external network calls** — all API calls go to the local Dataverse instance via relative URLs
- **No telemetry or analytics** — no data leaves your environment
- **Input validation** — all entity/field names validated against strict regex before use in API calls
- **OData injection prevention** — parameters are encoded and sanitized
- **Permission-aware** — respects Dataverse security roles; 403 errors are handled gracefully
- **No code execution from config** — configuration is parsed as JSON, never evaluated
- **React-safe rendering** — no `innerHTML`, no `dangerouslySetInnerHTML`, no `eval()`
