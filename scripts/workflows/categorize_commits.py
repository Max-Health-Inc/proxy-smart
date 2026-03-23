#!/usr/bin/env python3
"""
Categorize commit messages into changelog sections.
Fallback when AI generation is unavailable.
Reads commit_messages.txt and outputs changelog_entry.txt.
"""

import re
import sys
from pathlib import Path


def categorize_commits(input_file: str = "commit_messages.txt", output_file: str = "changelog_entry.txt") -> None:
    """Categorize commits from input file and write changelog entry."""
    features = []
    fixes = []
    docs = []
    chores = []
    others = []

    input_path = Path(input_file)
    if not input_path.exists():
        print(f"❌ Input file not found: {input_file}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue

            match = re.match(r"\[[a-f0-9]+\] [^:]+: (.+)", line)
            msg = match.group(1) if match else line
            msg_lower = msg.lower()

            if any(skip in msg_lower for skip in ["merge", "[skip ci]", "update version metadata"]):
                continue

            if msg_lower.startswith("feat:") or msg_lower.startswith("feature:"):
                features.append(re.sub(r"^(feat|feature):\s*", "", msg, flags=re.I))
            elif msg_lower.startswith("fix:") or "fix " in msg_lower or "bug" in msg_lower:
                fixes.append(re.sub(r"^fix:\s*", "", msg, flags=re.I))
            elif msg_lower.startswith("docs:"):
                docs.append(re.sub(r"^docs:\s*", "", msg, flags=re.I))
            elif any(msg_lower.startswith(p) for p in ["chore:", "ci:", "build:", "style:", "refactor:"]):
                chores.append(re.sub(r"^(chore|ci|build|style|refactor):\s*", "", msg, flags=re.I))
            else:
                others.append(msg)

    changelog = ""

    if features:
        changelog += "\n### ✨ Features\n\n"
        for f in features:
            changelog += f"- {f}\n"

    if fixes:
        changelog += "\n### 🐛 Bug Fixes\n\n"
        for f in fixes:
            changelog += f"- {f}\n"

    if docs:
        changelog += "\n### 📚 Documentation\n\n"
        for d in docs:
            changelog += f"- {d}\n"

    if chores:
        changelog += "\n### 🔧 Maintenance\n\n"
        for c in chores:
            changelog += f"- {c}\n"

    if others:
        changelog += "\n### 📦 Other Changes\n\n"
        for o in others:
            changelog += f"- {o}\n"

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(changelog)

    print(f"✅ Categorized {len(features)} features, {len(fixes)} fixes, {len(docs)} docs, {len(chores)} chores, {len(others)} others")


if __name__ == "__main__":
    categorize_commits()
