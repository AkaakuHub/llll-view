from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple

DEFAULT_COLORS: Sequence[str] = (
    "white",
    "black",
    "gray",
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "pink",
    "indigo",
    "teal",
    "cyan",
    "orange",
    "lime",
    "emerald",
    "sky",
    "violet",
    "fuchsia",
    "rose",
    "amber",
    "zinc",
    "neutral",
    "stone",
    "slate",
)

PATTERN_TEMPLATES: Sequence[str] = (
    r"(bg|text|border)-{colors}(-[0-9]+)?(/[0-9]+)?",
    r"from-{colors}(-[0-9]+)?(/[0-9]+)?",
    r"to-{colors}(-[0-9]+)?(/[0-9]+)?",
    r"via-{colors}(-[0-9]+)?(/[0-9]+)?",
    r"(ring|divide|outline)-{colors}(-[0-9]+)?(/[0-9]+)?",
    r"shadow-{colors}(-[0-9]+)?(/[0-9]+)?",
)


@dataclass
class Match:
    file_path: Path
    line_no: int
    line: str


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Detects usage of default Tailwind color classes."
    )
    parser.add_argument(
        "roots",
        nargs="*",
        default=["src"],
        help="Directories to scan. Defaults to recursive check of src",
    )
    parser.add_argument(
        "-e",
        "--extensions",
        nargs="+",
        default=[".tsx", ".ts", ".jsx", ".js"],
        help="File extensions to check. Can be specified with or without dot",
    )
    parser.add_argument(
        "--colors",
        nargs="+",
        help="List of default Tailwind colors to prohibit (overrides defaults)",
    )
    parser.add_argument(
        "--add-colors",
        nargs="+",
        default=[],
        help="Additional colors to add to default colors",
    )
    parser.add_argument(
        "--ignore-token",
        default="tailwind-ignore",
        help="Lines containing this string will be excluded from checks",
    )
    parser.add_argument(
        "--max-matches-per-file",
        type=int,
        default=5,
        help="Maximum number of matches to display per file (0 or less for unlimited)",
    )
    parser.add_argument(
        "--show-all",
        action="store_true",
        help="Show all detected lines (ignores --max-matches-per-file)",
    )
    parser.add_argument(
        "--fail-on-missing-dir",
        action="store_true",
        help="Exit with error if specified directory does not exist",
    )
    parser.add_argument(
        "--css-file",
        default="src/app/globals.css",
        help="Path to CSS file with @theme section for semantic color reference",
    )
    return parser.parse_args(argv)


def normalize_extensions(extensions: Sequence[str]) -> List[str]:
    normalized: List[str] = []
    for ext in extensions:
        value = ext.strip()
        if not value:
            continue
        normalized.append(value if value.startswith(".") else f".{value}")
    return [value.lower() for value in normalized]


def extract_theme_colors(css_file_path: Path) -> dict[str, list[str]]:
    """Extract color names from @theme section in CSS file."""
    colors = {
        "background": [],
        "text": [],
        "border": [],
        "other": [],
    }

    try:
        with css_file_path.open("r", encoding="utf-8") as f:
            in_theme = False
            for line in f:
                stripped = line.strip()

                # Find @theme section
                if "@theme" in stripped:
                    in_theme = True
                    continue

                # Exit @theme section on closing brace
                if in_theme and "}" in stripped:
                    in_theme = False
                    continue

                if not in_theme:
                    continue

                # Extract color definitions like --color-surface: #ffffff;
                match = re.match(r"--color-([\w-]+)\s*:", stripped)
                if match:
                    color_name = match.group(1)

                    # Categorize by prefix
                    if color_name.startswith("bg-"):
                        colors["background"].append(f"bg-{color_name[3:]}")
                    elif color_name.startswith("text-"):
                        colors["text"].append(f"text-{color_name[5:]}")
                    elif color_name.startswith("border-"):
                        colors["border"].append(f"border-{color_name[7:]}")
                    else:
                        colors["other"].append(color_name)
    except FileNotFoundError:
        print(f"⚠️ CSS file not found: {css_file_path}", file=sys.stderr)
    except OSError as exc:
        print(f"⚠️ Could not read CSS file: {css_file_path} ({exc})", file=sys.stderr)

    return colors


def build_patterns(colors: Sequence[str]) -> List[re.Pattern[str]]:
    unique_colors = sorted(
        {color.strip() for color in colors if color and color.strip()}
    )
    if not unique_colors:
        raise ValueError("Color list is empty")
    color_group = f"({'|'.join(unique_colors)})"
    return [
        re.compile(template.format(colors=color_group)) for template in PATTERN_TEMPLATES
    ]


def iter_target_files(roots: Sequence[Path], extensions: Sequence[str]) -> Iterable[Path]:
    for root in roots:
        for file_path in root.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in extensions:
                yield file_path


def scan_file(
    file_path: Path,
    patterns: Sequence[re.Pattern[str]],
    ignore_token: str,
    limit: Optional[int],
) -> Tuple[List[Match], bool]:
    matches: List[Match] = []
    truncated = False
    try:
        with file_path.open("r", encoding="utf-8") as handle:
            skip_next = False
            for line_no, line in enumerate(handle, start=1):
                stripped = line.rstrip("\r\n")
                contains_ignore_token = bool(ignore_token and ignore_token in stripped)

                if skip_next:
                    skip_next = False
                    if contains_ignore_token:
                        # Ignore token on comment line also skips next line
                        if not any(pattern.search(stripped) for pattern in patterns):
                            skip_next = True
                    continue

                has_forbidden_color = any(pattern.search(stripped) for pattern in patterns)

                if contains_ignore_token:
                    # Always skip if ignore token is on the same line.
                    # If it's a comment-only line, also skip the next line.
                    if not has_forbidden_color:
                        skip_next = True
                    continue

                if has_forbidden_color:
                    if limit is None or len(matches) < limit:
                        matches.append(Match(file_path=file_path, line_no=line_no, line=stripped))
                    else:
                        truncated = True
    except UnicodeDecodeError:
        print(f"⚠️ Could not read as UTF-8: {file_path}", file=sys.stderr)
    except OSError as exc:
        print(f"⚠️ Could not read file: {file_path} ({exc})", file=sys.stderr)
    return matches, truncated


def main(argv: Sequence[str]) -> int:
    args = parse_args(argv)

    extensions = normalize_extensions(args.extensions)
    colors: Sequence[str]
    if args.colors:
        colors = args.colors
    else:
        colors = list(DEFAULT_COLORS)
    if args.add_colors:
        colors = list(colors) + list(args.add_colors)

    try:
        patterns = build_patterns(colors)
    except ValueError as exc:
        print(f"❌ {exc}", file=sys.stderr)
        return 2

    root_paths = [Path(root) for root in args.roots]
    existing_roots = [path for path in root_paths if path.exists()]
    missing_roots = [path for path in root_paths if not path.exists()]

    for missing in missing_roots:
        print(f"⚠️ Specified directory does not exist: {missing}", file=sys.stderr)
    if args.fail_on_missing_dir and missing_roots:
        return 2
    if not existing_roots:
        print("⚠️ No valid directories specified. Exiting.", file=sys.stderr)
        return 2

    limit: Optional[int] = None
    if not args.show_all and args.max_matches_per_file > 0:
        limit = args.max_matches_per_file

    print("🎨 Checking for Tailwind default color usage...")

    any_errors = False
    for target_file in iter_target_files(existing_roots, extensions):
        matches, truncated = scan_file(target_file, patterns, args.ignore_token, limit)
        if not matches:
            continue
        any_errors = True
        print(f"❌ Found prohibited Tailwind colors: {target_file}")
        for match in matches:
            print(f"  {match.line_no}: {match.line}")
        if truncated:
            print("  ...")
        print("")

    if any_errors:
        css_path = Path(args.css_file)
        theme_colors = extract_theme_colors(css_path)

        print("💥 Tailwind default color usage detected!\n")
        print("📋 Please use the following semantic colors instead:\n")

        if theme_colors["background"]:
            print("  Backgrounds:")
            print(f"    {', '.join(theme_colors['background'])}")
            print("")

        if theme_colors["text"]:
            print("  Text:")
            print(f"    {', '.join(theme_colors['text'])}")
            print("")

        if theme_colors["border"]:
            print("  Borders:")
            print(f"    {', '.join(theme_colors['border'])}")
            print("")

        if theme_colors["other"]:
            print("  Other:")
            print(f"    {', '.join(theme_colors['other'])}")
            print("")

        print(f"🎨 See {args.css_file} @theme section for complete list.")
        return 1

    print("✅ No Tailwind default color usage detected.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print("🛑 Interrupted.", file=sys.stderr)
        sys.exit(130)
