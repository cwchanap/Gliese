#!/usr/bin/env python3
"""
Validate a Codex skill directory without requiring PyYAML.

This validator intentionally supports the constrained frontmatter and
agents/openai.yaml shapes used in this repo's project-level skills.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

MAX_SKILL_NAME_LENGTH = 64
MAX_DESCRIPTION_LENGTH = 1024
ALLOWED_FRONTMATTER_KEYS = {"name", "description", "license", "allowed-tools", "metadata"}


class ValidationError(Exception):
    pass


def extract_frontmatter(content: str) -> str:
    match = re.match(r"^---\n(.*?)\n---(?:\n|$)", content, re.DOTALL)
    if not match:
        raise ValidationError("Invalid or missing YAML frontmatter in SKILL.md")
    return match.group(1)


def parse_simple_yaml_block(text: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    lines = text.splitlines()
    index = 0

    while index < len(lines):
        raw_line = lines[index]
        if not raw_line.strip():
            index += 1
            continue

        if raw_line.startswith((" ", "\t", "- ")):
            raise ValidationError(f"Unsupported top-level YAML structure: {raw_line!r}")

        if ":" not in raw_line:
            raise ValidationError(f"Expected key:value YAML entry, got: {raw_line!r}")

        key, value = raw_line.split(":", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            raise ValidationError(f"Empty YAML key in line: {raw_line!r}")

        if value:
            parsed[key] = strip_quotes(value)
            index += 1
            continue

        nested_lines: list[str] = []
        index += 1
        while index < len(lines):
            nested_raw = lines[index]
            if not nested_raw.strip():
                nested_lines.append("")
                index += 1
                continue
            if nested_raw.startswith((" ", "\t", "- ")):
                nested_lines.append(nested_raw)
                index += 1
                continue
            break

        parsed[key] = "\n".join(nested_lines).rstrip()

    return parsed


def strip_quotes(value: str) -> str:
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
        return value[1:-1]
    return value


def validate_skill_md(skill_dir: Path) -> str:
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise ValidationError("SKILL.md not found")

    frontmatter = parse_simple_yaml_block(extract_frontmatter(skill_md.read_text()))
    unexpected = sorted(set(frontmatter) - ALLOWED_FRONTMATTER_KEYS)
    if unexpected:
        raise ValidationError(
            "Unexpected frontmatter key(s): " + ", ".join(unexpected)
        )

    name = frontmatter.get("name", "").strip()
    description = frontmatter.get("description", "").strip()

    if not name:
        raise ValidationError("Missing 'name' in SKILL.md frontmatter")
    if not re.fullmatch(r"[a-z0-9-]+", name):
        raise ValidationError(
            f"Invalid skill name '{name}'; expected lowercase hyphen-case"
        )
    if name.startswith("-") or name.endswith("-") or "--" in name:
        raise ValidationError(f"Invalid skill name '{name}'; malformed hyphen usage")
    if len(name) > MAX_SKILL_NAME_LENGTH:
        raise ValidationError(
            f"Skill name is too long ({len(name)} > {MAX_SKILL_NAME_LENGTH})"
        )

    if not description:
        raise ValidationError("Missing 'description' in SKILL.md frontmatter")
    if "<" in description or ">" in description:
        raise ValidationError("Description cannot contain angle brackets")
    if len(description) > MAX_DESCRIPTION_LENGTH:
        raise ValidationError(
            f"Description is too long ({len(description)} > {MAX_DESCRIPTION_LENGTH})"
        )

    return name


def validate_openai_yaml(skill_dir: Path, skill_name: str) -> None:
    openai_yaml = skill_dir / "agents" / "openai.yaml"
    if not openai_yaml.exists():
        raise ValidationError("agents/openai.yaml not found")

    content = openai_yaml.read_text().splitlines()
    if not content or content[0].strip() != "interface:":
        raise ValidationError("agents/openai.yaml must start with 'interface:'")

    fields: dict[str, str] = {}
    for line in content[1:]:
        if not line.strip():
            continue
        match = re.match(r"^  ([a-z_]+):\s+(.+)$", line)
        if not match:
            raise ValidationError(f"Unsupported openai.yaml line: {line!r}")
        key = match.group(1)
        value = strip_quotes(match.group(2).strip())
        fields[key] = value

    required = ["display_name", "short_description", "default_prompt"]
    for key in required:
        if not fields.get(key):
            raise ValidationError(f"Missing '{key}' in agents/openai.yaml")

    short_description = fields["short_description"]
    if not (25 <= len(short_description) <= 64):
        raise ValidationError(
            "agents/openai.yaml short_description must be 25-64 characters"
        )

    if f"${skill_name}" not in fields["default_prompt"]:
        raise ValidationError(
            "agents/openai.yaml default_prompt must explicitly mention the skill name"
        )


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: validate_skill.py <skill-directory>", file=sys.stderr)
        return 1

    skill_dir = Path(sys.argv[1]).expanduser()
    if not skill_dir.exists() or not skill_dir.is_dir():
        print(f"Skill directory not found: {skill_dir}", file=sys.stderr)
        return 1

    try:
        skill_name = validate_skill_md(skill_dir)
        validate_openai_yaml(skill_dir, skill_name)
    except ValidationError as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        return 1

    print(f"Skill is valid: {skill_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
