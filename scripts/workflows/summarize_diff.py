#!/usr/bin/env python3
"""
Generate concise summaries of git diffs using OpenAI Responses API.

Analyzes git diffs and creates human-readable summaries using GPT-5 nano.
Large diffs are truncated per-file to stay within token limits.

Usage:
    python scripts/workflows/summarize_diff.py [--base-ref BASE] [--head-ref HEAD]

Environment Variables:
    OPENAI_API_KEY: Required - Your OpenAI API key
"""

import argparse
import os
import subprocess
import sys

MAX_CHARS_PER_FILE = 1000


def get_git_diff(base_ref: str = "HEAD~1", head_ref: str = "HEAD") -> str:
    """Get git diff between two references."""
    try:
        result = subprocess.run(
            ["git", "diff", base_ref, head_ref],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error getting git diff: {e}", file=sys.stderr)
        print(f"   stderr: {e.stderr}", file=sys.stderr)
        sys.exit(1)


def truncate_file_diff(diff_section: str, max_chars: int = MAX_CHARS_PER_FILE) -> str:
    """Truncate a single file's diff, keeping headers."""
    if len(diff_section) <= max_chars:
        return diff_section

    lines = diff_section.split("\n")
    header_lines = []
    content_lines = []

    for line in lines:
        if (
            line.startswith("diff --git")
            or line.startswith("index ")
            or line.startswith("---")
            or line.startswith("+++")
            or line.startswith("@@")
        ):
            header_lines.append(line)
        else:
            content_lines.append(line)

    header_text = "\n".join(header_lines)
    available_chars = max_chars - len(header_text) - 100

    if available_chars < 100:
        return header_text + "\n... [diff too large, truncated]"

    content_text = "\n".join(content_lines)
    if len(content_text) > available_chars:
        truncated_chars = len(content_text) - available_chars
        content_text = (
            content_text[:available_chars] + f"\n... [truncated {truncated_chars} more chars]"
        )

    return header_text + "\n" + content_text


def truncate_diff(diff: str, max_chars_per_file: int = MAX_CHARS_PER_FILE) -> str:
    """Truncate diff by processing each file separately."""
    if not diff.strip():
        return diff

    file_sections = []
    current_section = []

    for line in diff.split("\n"):
        if line.startswith("diff --git"):
            if current_section:
                file_sections.append("\n".join(current_section))
            current_section = [line]
        else:
            current_section.append(line)

    if current_section:
        file_sections.append("\n".join(current_section))

    truncated_sections = [
        truncate_file_diff(section, max_chars_per_file) for section in file_sections
    ]
    return "\n\n".join(truncated_sections)


def summarize_with_openai(diff: str, api_key: str) -> str:
    """Generate a concise summary of the diff using OpenAI Responses API."""
    try:
        from openai import OpenAI
    except ImportError:
        return "Error: openai package not installed. Install with: pip install openai"

    if not diff.strip():
        return "No changes detected in this commit."

    client = OpenAI(api_key=api_key)

    prompt = f"""Analyze this git diff and provide a CONCISE summary that is short but meaningful for developers. Git diff:
```
{diff}
```

Summary:"""

    try:
        response = client.responses.create(
            model="gpt-5-nano",
            input=prompt,
            instructions="You are a technical assistant that creates concise diff summaries. Be direct and specific.",
            max_output_tokens=200,
            reasoning={"effort": "minimal"},
            text={"verbosity": "low"},
        )

        if response.output_text:
            return response.output_text.strip()

        return "Unable to generate summary (no output text)."

    except Exception as e:
        return f"Unable to generate AI summary: {str(e)}"


def get_commit_info(ref: str = "HEAD") -> dict[str, str]:
    """Get commit information."""
    try:
        hash_result = subprocess.run(
            ["git", "rev-parse", "--short", ref],
            capture_output=True, text=True, check=True,
        )
        msg_result = subprocess.run(
            ["git", "log", "-1", "--pretty=%B", ref],
            capture_output=True, text=True, check=True,
        )
        author_result = subprocess.run(
            ["git", "log", "-1", "--pretty=%an", ref],
            capture_output=True, text=True, check=True,
        )
        return {
            "hash": hash_result.stdout.strip(),
            "message": msg_result.stdout.strip(),
            "author": author_result.stdout.strip(),
        }
    except subprocess.CalledProcessError:
        return {"hash": "unknown", "message": "unknown", "author": "unknown"}


def main():
    parser = argparse.ArgumentParser(description="Generate concise summaries of git diffs using OpenAI API")
    parser.add_argument("--base-ref", type=str, default="HEAD~1", help="Base reference for diff")
    parser.add_argument("--head-ref", type=str, default="HEAD", help="Head reference for diff")
    parser.add_argument("--max-chars", type=int, default=MAX_CHARS_PER_FILE, help="Max chars per file diff")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ Error: OPENAI_API_KEY environment variable not set", file=sys.stderr)
        sys.exit(1)

    print("📊 Analyzing git diff...", file=sys.stderr)
    print(f"   Base: {args.base_ref}", file=sys.stderr)
    print(f"   Head: {args.head_ref}", file=sys.stderr)

    commit_info = get_commit_info(args.head_ref)
    diff = get_git_diff(args.base_ref, args.head_ref)

    if not diff.strip():
        print("ℹ️  No changes detected.", file=sys.stderr)
        return

    original_size = len(diff)
    diff = truncate_diff(diff, args.max_chars)
    truncated_size = len(diff)

    if truncated_size < original_size:
        print(f"📉 Diff truncated: {original_size} → {truncated_size} chars", file=sys.stderr)

    print("🤖 Generating summary with OpenAI GPT-5 nano...", file=sys.stderr)
    summary = summarize_with_openai(diff, api_key)

    print(f"Diff Summary: {summary}")
    print()
    print(f"Commit: {commit_info['hash']} by {commit_info['author']}")
    if truncated_size < original_size:
        print(f"(Diff truncated: {original_size} → {truncated_size} chars)")


if __name__ == "__main__":
    main()
