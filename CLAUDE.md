# Claude Code Guidelines

## Workflow

**After completing work on code changes, ALWAYS:**
1. Run `npm run typecheck` to verify TypeScript types
2. Run `npm run build` to ensure the build succeeds
3. Run `npm audit` to check for security vulnerabilities in dependencies
4. Only commit after all three checks pass

This ensures type safety, build integrity, and dependency security before any commit is made.

---

## Package Maintenance

### Dependency management
- Keep dependencies up to date — run `npm outdated` to identify stale packages before starting major work.
- Prefer pinned minor versions (`~x.y.z`) for direct dependencies and exact versions for internal utilities to avoid surprise upgrades.
- After updating any dependency, re-run `npm run typecheck` and `npm run build` to catch breaking changes early.
- Never commit `package-lock.json` conflicts without resolving them manually — always re-run `npm install` after resolving merge conflicts in `package.json`.

### Adding new dependencies
- Evaluate whether the dependency is actively maintained (last commit < 6 months, open issues ratio).
- Prefer packages with TypeScript types included (`@types/...` or bundled).
- Avoid dependencies that introduce sub-dependencies with known CVEs — check with `npm audit` immediately after install.
- Document the reason a new dependency was added in the PR description.

### Removing or replacing dependencies
- Run `npm prune` and check for unused packages before each release.
- When replacing a package, remove the old one explicitly (`npm uninstall <pkg>`) rather than leaving it unused.

---

## Future Improvements

### Before implementing a new feature
- Open a discussion in the PR or issue tracker about the design approach before writing code.
- Check if an existing Better Auth plugin already covers the use case.
- Prefer extending existing abstractions over adding new files — only create a new module when the concern is clearly distinct.
- Write or update a test for the new behavior before submitting the PR.

### Code quality
- Run `npm run typecheck` in strict mode — no `@ts-ignore` without a comment explaining why.
- Keep functions small and focused: if a function needs more than ~30 lines, consider splitting it.
- Avoid duplicating logic — extract shared utilities into `src/utils/` and import from there.

---

## Versioning & Changelog

### Semantic versioning decision table

Every change must be classified before bumping the version. Agents must use this table to determine the correct bump:

| Change type | Version bump | Examples |
|---|---|---|
| Breaking change in public API | **MAJOR** (`x+1.0.0`) | Renamed export, removed option, changed function signature |
| New feature, backward-compatible | **MINOR** (`x.y+1.0`) | New plugin support, new option with default value |
| Bug fix, no API change | **PATCH** (`x.y.z+1`) | Incorrect behavior corrected, typo fix in output |
| Security patch (dep or code) | **PATCH** | CVE fix, dependency upgrade to patched version |
| Internal refactor, no behavior change | none | Extract utility, rename internal variable |
| Docs / comments only | none | Update README, add JSDoc |

**When in doubt, prefer MINOR over MAJOR and PATCH over MINOR.**

### Validation criteria — agents must satisfy ALL before bumping a version

An agent working on a release must check off every item below before changing `package.json` version or writing the changelog entry:

#### Code criteria
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run build` produces a clean output with no warnings
- [ ] `npm audit` reports zero `high` or `critical` vulnerabilities
- [ ] No `@ts-ignore` or `any` added without an explanatory comment
- [ ] No hardcoded secrets, tokens, or credentials in the diff

#### Changelog criteria
- [ ] `CHANGELOG.md` entry written for the new version (see format below)
- [ ] Entry placed at the top of the file, above all previous entries
- [ ] Version number in the entry matches the one in `package.json`
- [ ] Every public-facing change has at least one bullet point
- [ ] Breaking changes are marked with a `BREAKING:` prefix
- [ ] Security fixes are marked with a `SECURITY:` prefix

#### Git criteria
- [ ] Version bump is in its own commit: `chore: bump version to x.y.z`
- [ ] Commit is tagged: `git tag vx.y.z`
- [ ] Tag message matches the first line of the changelog entry

---

### Changelog format

`CHANGELOG.md` must follow this exact structure for every release:

```markdown
## [x.y.z] — YYYY-MM-DD

### Added
- Short description of the new feature or option. (#issue or PR link if applicable)

### Changed
- BREAKING: Description of the breaking change and migration path.
- Description of a non-breaking behavioral change.

### Fixed
- Description of the bug that was fixed.

### Security
- SECURITY: CVE-XXXX-XXXX — description and affected versions.

### Removed
- Description of what was removed and why.
```

Rules for writing entries:
- Use past tense imperative: "Added support for X", "Fixed crash when Y", not "Adds" or "Fix".
- One bullet = one observable change. Do not bundle multiple changes in a single bullet.
- Omit sections that have no entries for that release.
- Reference issues or PRs with `(#123)` at the end of the bullet.
- The date must use ISO 8601 format: `YYYY-MM-DD`.

### Release workflow (step by step)

Agents must follow these steps in order — do not skip or reorder:

1. Verify all validation criteria above are satisfied.
2. Determine the correct version bump from the decision table.
3. Write the `CHANGELOG.md` entry using the format above.
4. Update `version` in `package.json`.
5. Run `npm install` to sync `package-lock.json`.
6. Run `npm run typecheck && npm run build && npm audit` one final time.
7. Commit: `git commit -m "chore: bump version to x.y.z"` (include only `package.json`, `package-lock.json`, `CHANGELOG.md`).
8. Tag: `git tag -a vx.y.z -m "<first line of changelog entry>"`.
9. Do NOT push or publish until the user explicitly confirms.

---

## Security & Vulnerability Checks

### Mandatory security checks
**Before every commit that touches `package.json`, dependencies, or auth-related code:**
1. Run `npm audit` — fix all `high` and `critical` severity issues before committing.
2. Run `npm audit --audit-level=moderate` to surface moderate issues and decide if they need addressing.
3. If `npm audit fix` is not safe (breaking changes), document the vulnerability and the accepted risk in the PR.

### Dependency vulnerability workflow
```
npm audit                          # list all vulnerabilities
npm audit --json | jq '.vulnerabilities'  # structured output
npm audit fix                      # auto-fix compatible patches
npm audit fix --force              # force-fix (may introduce breaking changes — review diff carefully)
```

### Auth-specific security rules
- Never log or expose session tokens, secret keys, or OAuth credentials — check diffs for accidental leaks before committing.
- Rotate `BETTER_AUTH_SECRET` if it is ever committed to git history, even in a private repo.
- All trusted origins must be explicitly listed — never use wildcard `*` in `trustedOrigins`.
- Validate and sanitize all user-supplied input at system boundaries before passing it to auth or database layers.
- Use parameterized queries — never concatenate user input into SQL strings.

### Suggested corrections for common vulnerabilities
| Vulnerability type | Detection | Suggested fix |
|---|---|---|
| Outdated dependency with CVE | `npm audit` | `npm update <pkg>` or pin a patched version |
| Prototype pollution | `npm audit` severity high | Upgrade or replace the affected package |
| ReDoS (regex denial of service) | `npm audit` | Upgrade to a patched version; avoid user-controlled regex input |
| Hardcoded secret in source | Manual review / git diff | Remove from code, rotate the secret, add to `.env`, update `.gitignore` |
| Missing CSRF protection | Code review | Ensure Better Auth CSRF plugin is enabled and `trustedOrigins` is configured |
| Exposed sensitive headers | Code review / network tab | Strip or restrict `Authorization` and `Set-Cookie` headers in API responses |
| Weak session config | Code review | Set `secure: true`, `httpOnly: true`, `sameSite: 'lax'` on all cookies |

### Periodic security review (monthly)
- Run `npm audit` and address any new advisories.
- Review open GitHub Security Advisories for packages in `package.json`.
- Check that all environment variables are present in `.env.example` (without real values) and that `.env` is in `.gitignore`.
- Confirm no secrets or API keys appear in git history: `git log --all --full-history -- "**/.env*"`.
