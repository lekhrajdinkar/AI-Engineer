#!/usr/bin/env python3
"""
Auto-generate mkdocs.yml from docs/ folder structure.

Rules:
- Scan docs/ recursively
- Extract titles from front-matter 'title' or humanize filename
- Order by numeric prefix (01_, 02_, etc.), then by weight in front-matter, then alphabetically
- Map folder/README.md to folder nav entry
- Exclude files ending with __x (e.g., file__x.md)
- Include all other folders (including 99_img/)
- Merge generated nav with mkdocs.template.yml and output mkdocs.yml
"""

import os
import re
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Configuration
DOCS_DIR = Path("docs")
TEMPLATE_FILE = Path("mkdocs.template.yml")
OUTPUT_FILE = Path("mkdocs.yml")
EXCLUDE_PATTERN = re.compile(r"__x\.md$")  # Exclude files ending with __x.md

def extract_front_matter(file_path: Path) -> Dict:
    """Extract front-matter from markdown file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Simple front-matter extraction (YAML between --- delimiters)
            if content.startswith('---'):
                parts = content.split('---', 2)
                if len(parts) >= 3:
                    try:
                        return yaml.safe_load(parts[1]) or {}
                    except yaml.YAMLError:
                        return {}
    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}", file=sys.stderr)
    return {}

def humanize_name(name: str) -> str:
    """Convert file/folder name to human-readable title.
    
    Examples:
    - 01_DVA.md -> DVA
    - SE_01_CSE -> SE 01 CSE
    - some_file -> Some File
    """
    # Remove leading numeric prefixes (01_, 02_, etc.)
    name = re.sub(r'^(\d+_)+', '', name)
    # Replace underscores and hyphens with spaces
    name = re.sub(r'[_-]+', ' ', name)
    # Smart capitalization: preserve all-caps acronyms, title-case regular words
    words = name.split()
    result = []
    for word in words:
        if word.isupper() and len(word) > 1:
            # Already all-caps (like AWS, CE, DVA, etc.) - keep as is
            result.append(word)
        elif word.isdigit():
            # Keep numeric words as-is
            result.append(word)
        else:
            # Title case regular words
            result.append(word.capitalize())
    return ' '.join(result)

def sort_key(name: str) -> Tuple[int, int, str]:
    """Generate sort key for files.
    
    Returns: (has_numeric_prefix, numeric_value, name)
    This ensures numeric prefixes come first, sorted numerically, then alphabetically.
    """
    match = re.match(r'^(\d+)_', name)
    if match:
        num = int(match.group(1))
        return (0, num, name)
    return (1, 0, name)

def build_nav_tree(start_path: Path, root_docs: Path) -> Optional[Dict]:
    """Recursively build nav tree from folder structure.
    
    Returns dict with 'title' and optional 'children' list, or None if empty.
    """
    items = []
    
    try:
        entries = sorted(start_path.iterdir(), key=lambda x: sort_key(x.name))
    except PermissionError:
        return None
    
    for entry in entries:
        # Skip hidden files/folders
        if entry.name.startswith('.'):
            continue
        
        if entry.is_dir():
            # Handle directory: include its index (index.md) as folder index if present,
            # then include other children (recursively). We no longer treat README.md as folder index.
            index_file = None
            for p in entry.iterdir():
                if p.is_file() and p.name.lower() == 'index.md':
                    index_file = p
                    break

            dir_children = []
            if index_file:
                # Skip excluded README variants
                if not EXCLUDE_PATTERN.search(index_file.name):
                    fm = extract_front_matter(index_file)
                    idx_title = fm.get('title', humanize_name(index_file.stem))
                    rel = index_file.relative_to(root_docs)
                    rel_str = str(rel).replace('\\', '/')
                    dir_children.append({'title': idx_title, 'file': rel_str})

            # Recursively process remaining files/directories (build_nav_tree will skip README files)
            sub_tree = build_nav_tree(entry, root_docs)
            if sub_tree and 'children' in sub_tree:
                # extend children after index (if any)
                for c in sub_tree['children']:
                    dir_children.append(c)

            if dir_children:
                items.append({
                    'title': humanize_name(entry.name),
                    'children': dir_children
                })
        elif entry.is_file() and entry.suffix == '.md':
            # Skip excluded files (ending with __x.md)
            if EXCLUDE_PATTERN.search(entry.name):
                continue
            # Skip README.md (will be handled by parent as folder index)
            if entry.name.lower() == 'readme.md':
                continue
            
            # Extract title and weight
            front_matter = extract_front_matter(entry)
            title = front_matter.get('title', humanize_name(entry.stem))
            weight = front_matter.get('weight', float('inf'))
            
            # Relative path from docs dir for mkdocs (use forward slashes)
            rel_path = entry.relative_to(root_docs)
            rel_path_str = str(rel_path).replace('\\', '/')
            
            items.append({
                'title': title,
                'file': rel_path_str,
                'weight': weight
            })
    
    # Sort items: by weight, then by sort_key
    items.sort(key=lambda x: (
        x.get('weight', float('inf')),
        sort_key(x.get('title', x.get('file', ''))[0] if isinstance(x.get('title', ''), str) else '')
    ))
    
    # Remove weight field (it's only for sorting)
    for item in items:
        if 'weight' in item:
            del item['weight']
    
    if items:
        return {'children': items}
    return None

def nav_tree_to_list(tree: Dict) -> List:
    """Convert nav tree dict to mkdocs nav list format."""
    if not tree or 'children' not in tree:
        return []
    
    result = []
    for item in tree['children']:
        if 'children' in item:
            # Folder with children
            # If the first child is a file representing the folder README, keep it as first entry
            children_list = []
            for c in item['children']:
                if 'children' in c:
                    children_list.append({c['title']: nav_tree_to_list({'children': c['children']})})
                else:
                    children_list.append({c['title']: c['file']})
            result.append({item['title']: children_list})
        else:
            # File entry
            result.append({item['title']: item['file']})
    
    return result

def generate_mkdocs_config() -> Dict:
    """Generate mkdocs config with nav from docs/ structure."""
    nav_tree = build_nav_tree(DOCS_DIR, DOCS_DIR)
    nav_list = nav_tree_to_list(nav_tree) if nav_tree else []

    # Ensure there's a Home (root) page: if no docs/index.md exists at root,
    # pick the first top-level index (e.g., docs/2022-2025/index.md) as Home to avoid 404 on '/'
    has_root_index = False
    for entry in nav_list:
        # entry can be dict mapping title->file/list
        for v in entry.values():
            if isinstance(v, str):
                # Check only the basename so paths like '2022-2025/README.md' are handled
                if os.path.basename(v).lower() == 'index.md':
                    has_root_index = True
    if not has_root_index:
        # find first top-level index under docs/ (exclude README.md)
        first_index = None
        # check root docs/index.md first
        root_index = DOCS_DIR / 'index.md'
        if root_index.is_file():
            first_index = root_index.relative_to(DOCS_DIR).as_posix()
        else:
            for child in DOCS_DIR.iterdir():
                if child.is_dir():
                    for p in child.iterdir():
                        if p.is_file() and p.name.lower() == 'index.md':
                            first_index = p.relative_to(DOCS_DIR).as_posix()
                            break
                if first_index:
                    break
        if first_index:
            nav_list.insert(0, {'Home': first_index})
    
    return {'nav': nav_list}

def merge_configs(template_config: Dict, generated_config: Dict) -> Dict:
    """Merge generated nav into template config."""
    merged = template_config.copy()
    merged['nav'] = generated_config.get('nav', [])
    return merged

def load_template() -> Dict:
    """Load mkdocs template file."""
    if TEMPLATE_FILE.exists():
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    return {}

def write_config(config: Dict, output_path: Path) -> None:
    """Write mkdocs config to YAML file."""
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    print(f"✓ Generated {output_path}")

def check_mode(config_path: Path) -> bool:
    """Check if generated config matches existing config (for CI/pre-commit)."""
    if not config_path.exists():
        print(f"✗ {config_path} does not exist.")
        return False
    
    with open(config_path, 'r', encoding='utf-8') as f:
        existing = yaml.safe_load(f) or {}
    
    generated_config = generate_mkdocs_config()
    template_config = load_template()
    new_config = merge_configs(template_config, generated_config)
    
    if new_config == existing:
        print(f"✓ {config_path} is up-to-date.")
        return True
    else:
        print(f"✗ {config_path} is out of date. Run 'python scripts/generate_mkdocs.py' to update.")
        return False

def main():
    """Main entry point."""
    # Check for --check flag
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        if not check_mode(OUTPUT_FILE):
            sys.exit(1)
        return
    
    # Load template and generate config
    template_config = load_template()
    generated_config = generate_mkdocs_config()
    merged_config = merge_configs(template_config, generated_config)
    
    # Write output
    write_config(merged_config, OUTPUT_FILE)
    
    # Print nav structure for verification
    print("\n--- Generated Nav Structure ---")
    if merged_config.get('nav'):
        for item in merged_config['nav']:
            print(yaml.dump([item], default_flow_style=False, sort_keys=False))

if __name__ == '__main__':
    main()


