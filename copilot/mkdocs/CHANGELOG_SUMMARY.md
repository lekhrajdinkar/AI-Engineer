# MkDocs Configuration Changes Summary

## Session: July 15, 2026

### 1. Script Updates (`scripts/generate_mkdocs.py`)
**Goal:** Fix nav generation and exclude README.md

**Changes:**
- Fixed nav paths to be relative to `docs/` directory
- Changed Home detection from `readme.md` → only `index.md`
- Directories now use `index.md` as folder index (not `README.md`)
- Home fallback searches for root `index.md` first, then first top-level `index.md`

**Result:** 
- Nav structure is clean and README.md files are no longer auto-indexed
- Only `index.md` files are used as directory indices

**Run:**
```powershell
python .\scripts\generate_mkdocs.py
```

---

### 2. Theme Styling (`mkdocs.template.yml`)
**Goal:** Update navigation and TOC display

**Changes Made:**
| Feature | Action | Result |
|---------|--------|--------|
| `navigation.expand` | **Removed** | Left nav stays **collapsed by default** |
| `toc.integrate` | **Removed** | Page TOC moves to **right sidebar** |

**Result:** 
- Cleaner left sidebar (users click to expand sections)
- Right sidebar shows current page headings (updates dynamically)
- Standard Material theme pattern

**Build:**
```powershell
mkdocs build
```

---

## Files Modified
- `scripts/generate_mkdocs.py` - Nav generation logic
- `mkdocs.template.yml` - Theme configuration
- `mkdocs.yml` - Auto-generated config (do NOT edit manually)
- `site/` - Rebuilt static site

---

## Quick Reference

**To regenerate nav after docs changes:**
```powershell
python .\scripts\generate_mkdocs.py
mkdocs build
```

**Key Rules:**
- ✅ Use `index.md` for directory indices
- ❌ Don't use `README.md` as folder index (it's excluded)
- ❌ Never manually edit `mkdocs.yml` (auto-generated)
- ✅ Edit `mkdocs.template.yml` for theme/config changes

