#!/usr/bin/env python3
"""
Generate AI-powered changelog from diff summary commit comments.
Called by update-changelog.yml and release-orchestrator.yml workflows.

Strategy:
1. Get commit SHAs in the release range
2. Fetch AI diff-summary comments from those commits (posted by diff-summary.yml)
3. Feed summaries to OpenAI to generate a grouped changelog
4. Fall back to raw commit messages if no diff-summary comments are found
"""

import json
import os
import re
import subprocess
import sys
import urllib.request
import urllib.error


DIFF_SUMMARY_MARKER = "AI-Generated Commit Summary"


def is_stable_release(version: str) -> bool:
    """Check if version is a stable release (no alpha/beta/rc)."""
    return not any(pre in version.lower() for pre in ["alpha", "beta", "rc"])


def get_base_version(version: str) -> str:
    """Extract base version (e.g., '1.0.0' from '1.0.0-alpha.123')."""
    return version.split("-")[0].split("+")[0]


def get_commit_range(current_version: str, target_branch: str = "beta") -> tuple[list[str], str]:
    """
    Get commit SHAs in the release range.
    Returns (list of SHAs, description).
    """
    try:
        result = subprocess.run(
            ["git", "tag", "-l", "v*", "--sort=-version:refname"],
            capture_output=True, text=True, check=True,
        )
        tags = [tag.strip() for tag in result.stdout.strip().split("\n") if tag.strip()]

        if not tags:
            print("ℹ️  No previous release tags found, using all commits")
            result = subprocess.run(
                ["git", "log", f"origin/{target_branch}", "--pretty=format:%H", "--no-merges"],
                capture_output=True, text=True, check=True,
            )
            shas = [s.strip() for s in result.stdout.strip().split("\n") if s.strip()]
            return shas, "all commits"

        last_tag = tags[0]
        print(f"📌 Last release: {last_tag}")

        if is_stable_release(current_version):
            base_version = get_base_version(current_version)
            print(f"🎯 Stable release detected: {base_version}")

            last_stable_tag = None
            for tag in tags:
                tag_version = tag.lstrip("v")
                if is_stable_release(tag_version) and get_base_version(tag_version) != base_version:
                    last_stable_tag = tag
                    break

            ref_from = last_stable_tag
            if ref_from:
                print(f"📚 Accumulating changes from {ref_from} (last stable)")
                range_spec = f"{ref_from}..origin/{target_branch}"
            else:
                print("📚 No previous stable release, accumulating all commits")
                range_spec = f"origin/{target_branch}"

            result = subprocess.run(
                ["git", "log", range_spec, "--pretty=format:%H", "--no-merges"],
                capture_output=True, text=True, check=True,
            )
            shas = [s.strip() for s in result.stdout.strip().split("\n") if s.strip()]
            desc = f"accumulated from {ref_from}" if ref_from else "accumulated (all commits)"
            return shas, desc
        else:
            print(f"🔄 Pre-release detected, showing changes since {last_tag}")
            result = subprocess.run(
                ["git", "log", f"{last_tag}..origin/{target_branch}", "--pretty=format:%H", "--no-merges"],
                capture_output=True, text=True, check=True,
            )
            shas = [s.strip() for s in result.stdout.strip().split("\n") if s.strip()]
            return shas, f"since {last_tag}"

    except Exception as e:
        print(f"⚠️  Error getting commits: {e}")
        return [], "error"


def fetch_diff_summaries(commit_shas: list[str]) -> list[str]:
    """Fetch AI diff-summary comments from GitHub commit comments API."""
    github_token = os.environ.get("GITHUB_TOKEN", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "")

    if not github_token or not repo:
        print("⚠️  GITHUB_TOKEN or GITHUB_REPOSITORY not set, cannot fetch commit comments")
        return []

    summaries = []
    api_base = f"https://api.github.com/repos/{repo}/commits"

    for sha in commit_shas:
        url = f"{api_base}/{sha}/comments"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
        try:
            with urllib.request.urlopen(req) as resp:
                comments = json.loads(resp.read().decode())

            for comment in comments:
                body = comment.get("body", "")
                if DIFF_SUMMARY_MARKER in body:
                    # Strip the header/footer added by the workflow
                    cleaned = re.sub(
                        r"^## 🤖 AI-Generated Commit Summary\s*\n*", "", body
                    )
                    cleaned = re.sub(
                        r"\n*---\n\*Generated by.*$", "", cleaned, flags=re.DOTALL
                    )
                    short_sha = sha[:7]
                    summaries.append(f"[{short_sha}] {cleaned.strip()}")
                    break  # One summary per commit
        except urllib.error.HTTPError as e:
            if e.code != 404:
                print(f"⚠️  Error fetching comments for {sha[:7]}: {e.code}")
        except Exception as e:
            print(f"⚠️  Error fetching comments for {sha[:7]}: {e}")

    return summaries


def get_raw_commit_messages(commit_shas: list[str]) -> str:
    """Fallback: get raw commit messages via git log."""
    if not commit_shas:
        return ""
    result = subprocess.run(
        ["git", "log", "--pretty=format:%h - %s (%an)", "--no-merges", "--stdin"],
        input="\n".join(commit_shas),
        capture_output=True, text=True,
    )
    # git log --stdin doesn't work well, use the SHAs directly
    messages = []
    for sha in commit_shas:
        result = subprocess.run(
            ["git", "log", "-1", "--pretty=format:%h - %s (%an)", sha],
            capture_output=True, text=True,
        )
        if result.stdout.strip():
            messages.append(result.stdout.strip())
    return "\n".join(messages)


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("⚠️  Warning: OPENAI_API_KEY not set, skipping AI generation")
        sys.exit(0)

    try:
        from openai import OpenAI
    except ImportError:
        print("⚠️  Warning: openai package not available, skipping AI generation")
        sys.exit(0)

    pr_title = os.environ.get("PR_TITLE", "")
    pr_body = os.environ.get("PR_BODY", "")
    pr_url = os.environ.get("PR_URL", "")
    target_branch = os.environ.get("TARGET_BRANCH", "beta")

    # Read version from package.json
    try:
        with open("package.json", encoding="utf-8") as f:
            pkg = json.load(f)
        current_version = pkg.get("version", "unknown")
        print(f"📦 Current version: {current_version}")
    except Exception as e:
        print(f"⚠️  Could not read version from package.json: {e}")
        current_version = "unknown"

    commit_shas, commit_description = get_commit_range(current_version, target_branch)

    if not commit_shas:
        print(f"ℹ️  No new commits {commit_description}")
        with open("changelog_entry.txt", "w") as f:
            f.write("\n- 🔧 Chores & Improvements: Internal maintenance and updates\n")
        sys.exit(0)

    print(f"📝 Found {len(commit_shas)} commits ({commit_description})")

    # Try to fetch rich diff-summary comments first
    summaries = fetch_diff_summaries(commit_shas)
    if summaries:
        input_text = "\n\n".join(summaries)
        source = "diff summaries"
        print(f"✅ Found {len(summaries)}/{len(commit_shas)} diff-summary comments")
    else:
        input_text = get_raw_commit_messages(commit_shas)
        source = "raw commit messages"
        print("ℹ️  No diff-summary comments found, using raw commit messages")

    if not input_text.strip():
        print("ℹ️  No content to analyze")
        with open("changelog_entry.txt", "w") as f:
            f.write("\n- 🔧 Chores & Improvements: Internal maintenance and updates\n")
        sys.exit(0)

    print(f"📝 Analyzing {source} ({commit_description})")

    try:
        client = OpenAI(api_key=api_key)

        stable_note = (
            "This is a STABLE RELEASE - accumulate ALL significant changes from alpha, beta, and rc versions."
            if is_stable_release(current_version)
            else f"This is a pre-release ({current_version}) - show ONLY changes since the last release."
        )

        source_instruction = (
            "Each block below is an AI-generated diff summary for a commit. These are rich descriptions of actual code changes."
            if source == "diff summaries"
            else "Each line below is a raw commit message."
        )

        prompt = f"""Analyze these {source} and create a concise changelog entry.

{stable_note}

PR Title: {pr_title}
PR Description: {pr_body[:500] if pr_body else "No description"}

{source_instruction}
Your task: Create a concise, high-level changelog by grouping related changes.

Format the changelog with these categories (only include categories that apply):
- ✨ Features (new functionality)
- 🐛 Bug Fixes (fixes to existing functionality)
- 📚 Documentation (documentation changes)
- 🔧 Chores & Improvements (maintenance, refactoring, CI/CD)
- ⚠️  Breaking Changes (if any)

IMPORTANT RULES:
1. Skip ALL "update" commits unless they have meaningful context
2. Skip merge commits (e.g., "Merge develop into beta")
3. Skip metadata commits (e.g., "chore: update version metadata")
4. Group duplicate/similar fixes together
5. Be concise - combine related changes into single bullets
6. Focus on user-facing or developer-relevant changes only
{"7. For stable releases: Group and summarize all major features/fixes from pre-releases" if is_stable_release(current_version) else ""}

If NO meaningful changes are found (only "update" commits), output:
"- 🔧 Chores & Improvements: Internal updates and maintenance"

{source.title()} ({commit_description}):
```
{input_text}
```

Generate a clean, professional changelog entry:"""

        response = client.responses.create(
            model="gpt-5-nano",
            input=prompt,
            instructions="You are a helpful assistant that creates changelog entries from code change summaries. Be concise, use the specified emoji categories, and group related changes together.",
            max_output_tokens=1000,
            reasoning={"effort": "minimal"},
            text={"verbosity": "low"},
        )

        if response.output_text:
            changelog = response.output_text.strip()
            if not changelog.startswith("\n"):
                changelog = "\n" + changelog
            if pr_url:
                changelog += f"\n\n**Full Changelog**: {pr_url}\n"

            with open("changelog_entry.txt", "w", encoding="utf-8") as f:
                f.write(changelog)

            print("✅ Generated AI-powered changelog entry")
            print(changelog)
        else:
            print("⚠️  No output from OpenAI, skipping")
            sys.exit(0)

    except Exception as e:
        print(f"⚠️  Error generating AI summary: {e}")
        sys.exit(0)


if __name__ == "__main__":
    main()
