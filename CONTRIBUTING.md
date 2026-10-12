# Contributing to TypeStyles

Thanks for helping improve TypeStyles. This guide covers the basics for contributing code, docs, and ideas to the monorepo.

If you are new to the project, start with [README.md](./README.md) for the overview and [ARCHITECTURE.md](./ARCHITECTURE.md) for the project structure and design decisions.

## How to contribute

- Check existing issues and discussions before starting work.
- Open or comment on an issue for bugs, feature requests, or larger changes so the scope is clear.
- Keep changes small and focused when possible.
- If your work affects multiple packages, call that out early so reviewers can understand the impact.

## Code of Conduct

Be respectful, constructive, and collaborative in all project interactions. We expect contributors to communicate in good faith and to help maintain a welcoming environment for everyone.

## Branching and PR process

- Create a feature branch from the latest main branch.
- Use a descriptive branch name and PR title that matches the change.
- Link the related issue in the PR description when applicable.
- Keep pull requests scoped to one concern whenever possible.
- Include context, screenshots, or examples when a change affects docs or output.
- Wait for checks to pass before requesting review or merging.

## Coding standards

- Follow the existing TypeScript-first patterns used across the monorepo.
- Match local conventions instead of introducing new abstractions.
- Use Prettier for formatting and keep markdown, code samples, and docs consistent.
- Prefer clear names, small functions, and changes that fit the surrounding package.
- When editing docs, keep examples aligned with the current architecture and terminology.

## Testing and linting

Before opening a PR, run the checks that apply to your change. At minimum, that usually means:

- `pnpm lint`
- `pnpm test`
- `pnpm format:check`

If your change only touches a subset of the repo, you can run the narrower package-level command that covers it, but do not skip the broader checks if the change is cross-cutting.

## Issue reporting

When filing a bug report or feature request, include:

- A short summary of the problem or request
- The package, example, or docs page involved
- Steps to reproduce, if applicable
- Expected vs. actual behavior
- Any relevant code snippets, screenshots, or error output
- Your environment details when they matter

## Environment setup

This repository uses `pnpm`.

1. Install dependencies with `pnpm install`.
2. Run the relevant workspace command, or `pnpm dev` for the full monorepo.
3. Use `pnpm lint`, `pnpm test`, and `pnpm format:check` to validate changes before opening a PR.

## Inspired by Style Dictionary

This contributor guide is inspired by the clear, practical contributor guidance used by [Style Dictionary](https://styledictionary.com/). It follows the same spirit: keep changes focused, explain the workflow, and make it easy for new contributors to get started.
