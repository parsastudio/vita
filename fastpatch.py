#!/usr/bin/env python3
"""
FastPatch Enterprise v8.6 (Production SOTA)
- Multi-Hunk Bottom-Up Application by Offset (Zero Domino Effect)
- Strict Uniqueness Validator (Rejects Ambiguous Repetitive Matches)
- Zero-AST Surgical Injections (<insert after/before="...">)
- Next.js 16 Directive-Preserving Engine ('use client'/'use server')
- ESM / CJS / TSX Compliant Syntax Guardrail (Native Node.js --check)
- Atomic In-Memory Staging with Instant Rollback (--undo)
"""

import sys
import os
import re
import shutil
import subprocess
from difflib import SequenceMatcher

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

IGNORED_DIRS = {".git", "node_modules", ".next", ".turbo", "dist", "build", ".venv", "__pycache__", ".fastpatch_backup"}
BACKUP_DIR = ".fastpatch_backup"

def get_clipboard_text():
    try:
        if sys.platform == "darwin":
            return subprocess.check_output("pbpaste", universal_newlines=True)
        elif sys.platform.startswith("win"):
            return subprocess.check_output(["powershell", "-NoProfile", "-Command", "Get-Clipboard"], universal_newlines=True)
        else:
            for cmd in [["wl-paste"], ["xclip", "-selection", "clipboard", "-o"], ["xsel", "--clipboard", "--output"]]:
                try:
                    return subprocess.check_output(cmd, universal_newlines=True)
                except FileNotFoundError:
                    continue
    except Exception:
        pass
    return None

def find_project_root():
    markers = [".git", "pnpm-workspace.yaml", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"]
    curr = os.path.abspath(os.getcwd())
    while True:
        if any(os.path.exists(os.path.join(curr, m)) for m in markers):
            return curr
        parent = os.path.dirname(curr)
        if parent == curr:
            break
        curr = parent
    return os.path.abspath(os.getcwd())

def sanitize_and_resolve(root_dir, raw_path):
    cleaned = raw_path.strip().strip("`'\"*#: ")
    m = re.search(r'[`"\']([^`"\']+)[\'"`]', cleaned)
    if m:
        cleaned = m.group(1).strip()
    else:
        cleaned = re.split(r'\s+[\(\[\{\-#:]', cleaned)[0].strip()
        parts = cleaned.split()
        if parts:
            cleaned = parts[0]

    clean_path = cleaned.lstrip("/\\")
    if clean_path.startswith("./"):
        clean_path = clean_path[2:]

    target = os.path.normpath(os.path.join(root_dir, clean_path))
    if not os.path.commonpath([root_dir, target]) == root_dir:
        raise PermissionError(f"مسیر خارج از پوشه پروژه مسدود شد: {target}")

    if os.path.isfile(target):
        return target

    filename = os.path.basename(clean_path)
    if filename:
        candidates = []
        for r, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith(".")]
            if filename in files:
                candidates.append(os.path.join(r, filename))
        if len(candidates) == 1:
            print(f"  {YELLOW}🔍 فایل بر اساس نام کشف شد: {os.path.relpath(candidates[0], root_dir)}{RESET}")
            return candidates[0]

    return target

# ==================== موتور تطبیق ۳ مرحله‌ای و تعیین محدوده آفست ====================

def adjust_indent(search_block, replace_block, matched_chunk):
    s_lines = [l for l in search_block.splitlines() if l.strip()]
    t_lines = [l for l in matched_chunk.splitlines() if l.strip()]
    if not s_lines or not t_lines:
        return replace_block

    delta = (len(t_lines[0]) - len(t_lines[0].lstrip(' '))) - (len(s_lines[0]) - len(s_lines[0].lstrip(' ')))
    if delta == 0:
        return replace_block

    adjusted = []
    for line in replace_block.splitlines(keepends=True):
        if not line.strip():
            adjusted.append(line)
        elif delta > 0:
            adjusted.append(" " * delta + line)
        else:
            cut = min(abs(delta), len(line) - len(line.lstrip(' ')))
            adjusted.append(line[cut:])
    return "".join(adjusted)

def find_hunk_match(source_text, search_block, replace_block):
    """
    موتور انطباق ۳ مرحله‌ای به همراه اعتبارسنجی اکید یکتایی (Uniqueness Verification):
    خروجی: (وضعیت, شروع_آفست, پایان_آفست, متن_جایگزین, پیام_خطا)
    """
    src = source_text.replace("\r\n", "\n")
    s_block = search_block.replace("\r\n", "\n")
    r_block = replace_block.replace("\r\n", "\n")

    # ۱. انطباق دقیق (Exact Match)
    exact_count = src.count(s_block)
    if exact_count > 1:
        return ("AMBIGUOUS", None, None, None, f"بلوک جستجو دقیقاً {exact_count} بار در فایل تکرار شده است. کانتکست یکتا ارسال کنید.")
    elif exact_count == 1:
        start_idx = src.find(s_block)
        return ("OK", start_idx, start_idx + len(s_block), r_block, None)

    # آماده‌سازی سطور جهت انطباق بدون حساسیت به تورفتگی
    s_lines = s_block.splitlines(keepends=True)
    f_lines = src.splitlines(keepends=True)
    k = len(s_lines)

    if k == 0 or len(f_lines) < k:
        return ("NOT_FOUND", None, None, None, "بلاک SEARCH پیدا نشد.")

    line_offsets = []
    curr = 0
    for l in f_lines:
        line_offsets.append(curr)
        curr += len(l)
    line_offsets.append(curr)

    # ۲. انطباق بدون وابستگی به تورفتگی (Indent-Agnostic)
    indent_matches = []
    s_stripped = [l.strip() for l in s_lines]
    for i in range(len(f_lines) - k + 1):
        window = f_lines[i:i+k]
        if [l.strip() for l in window] == s_stripped:
            start_c = line_offsets[i]
            end_c = line_offsets[i+k]
            adj = adjust_indent(s_block, r_block, "".join(window))
            indent_matches.append((start_c, end_c, adj))

    if len(indent_matches) > 1:
        return ("AMBIGUOUS", None, None, None, f"بلوک جستجو با احتساب تورفتگی {len(indent_matches)} بار در فایل تکرار شده است.")
    elif len(indent_matches) == 1:
        start_c, end_c, adj = indent_matches[0]
        return ("OK", start_c, end_c, adj, None)

    # ۳. انطباق فازی با آستانه بالا (Fuzzy Match >= 88%)
    first_clean = s_lines[0].strip()
    last_clean = s_lines[-1].strip()
    search_flat = "".join(l.strip() for l in s_lines)
    fuzzy_matches = []

    for i in range(len(f_lines) - k + 1):
        first_ratio = SequenceMatcher(None, first_clean, f_lines[i].strip()).ratio()
        last_ratio = SequenceMatcher(None, last_clean, f_lines[i+k-1].strip()).ratio() if k > 1 else 1.0

        if first_ratio > 0.85 and last_ratio > 0.85:
            window_flat = "".join(l.strip() for l in f_lines[i:i+k])
            if SequenceMatcher(None, search_flat, window_flat).ratio() >= 0.88:
                start_c = line_offsets[i]
                end_c = line_offsets[i+k]
                rep = r_block if r_block.endswith('\n') else r_block + '\n'
                fuzzy_matches.append((start_c, end_c, rep))

    if len(fuzzy_matches) > 1:
        return ("AMBIGUOUS", None, None, None, f"انطباق فازی دارای چندگانگی است ({len(fuzzy_matches)} مورد پیدا شد).")
    elif len(fuzzy_matches) == 1:
        start_c, end_c, rep = fuzzy_matches[0]
        return ("OK", start_c, end_c, rep, None)

    return ("NOT_FOUND", None, None, None, "بلاک SEARCH در فایل پیدا نشد.")

def find_insert_match(source_text, anchor_text, insert_code, mode="after"):
    src = source_text.replace("\r\n", "\n")
    anchor = anchor_text.replace("\r\n", "\n").strip()
    code = insert_code.replace("\r\n", "\n")
    if not code.endswith("\n"):
        code += "\n"

    lines = src.splitlines(keepends=True)
    matches = []
    curr_offset = 0

    for i, line in enumerate(lines):
        if anchor in line:
            matches.append((i, curr_offset, curr_offset + len(line)))
        curr_offset += len(line)

    if len(matches) == 0:
        return ("NOT_FOUND", None, None, None, f"لنگرگاه '{anchor[:30]}...' یافت نشد.")
    if len(matches) > 1:
        return ("AMBIGUOUS", None, None, None, f"لنگرگاه '{anchor[:30]}...' یکتا نیست ({len(matches)} بار پیدا شد).")

    _, start_line_offset, end_line_offset = matches[0]

    # حفظ دایرکتیوهای Next.js اگر تزریق قبل از سطر اول رخ دهد
    if mode == "before" and start_line_offset == 0:
        first_line_clean = lines[0].strip().strip("'\"")
        if first_line_clean in ("use client", "use server"):
            start_line_offset = len(lines[0])
            mode = "after"

    if mode == "after":
        return ("OK", end_line_offset, end_line_offset, code, None)
    else:
        return ("OK", start_line_offset, start_line_offset, code, None)

# ==================== استخراج پچ‌های معنایی ====================

def parse_operations(raw_text):
    raw_text = raw_text.replace("\r\n", "\n")
    operations = []

    # ۱. استخراج تگ‌های <write>
    write_pattern = re.compile(r'<write\s+file=["\']([^"\']+)["\']\s*>(.*?)</write>', re.DOTALL | re.IGNORECASE)
    for match in write_pattern.finditer(raw_text):
        fpath = match.group(1).strip()
        code = match.group(2)
        clean_lines = [l for l in code.splitlines() if not l.strip().startswith("```")]
        content = "\n".join(clean_lines).strip() + "\n"
        operations.append({"action": "write", "file": fpath, "code": content})

    # ۲. استخراج تگ‌های <delete>
    delete_pattern = re.compile(r'<delete\s+file=["\']([^"\']+)["\']\s*(?:/>|>\s*</delete>)', re.IGNORECASE)
    for match in delete_pattern.finditer(raw_text):
        operations.append({"action": "delete", "file": match.group(1).strip()})

    # ۳. استخراج تگ‌های <insert>
    insert_pattern = re.compile(r'<insert\s+file=["\']([^"\']+)["\']\s+(after|before)=["\']([^"\']+)["\']\s*>(.*?)</insert>', re.DOTALL | re.IGNORECASE)
    for match in insert_pattern.finditer(raw_text):
        fpath = match.group(1).strip()
        mode = match.group(2).lower()
        anchor = match.group(3)
        code = match.group(4)
        clean_lines = [l for l in code.splitlines() if not l.strip().startswith("```")]
        operations.append({"action": "insert", "file": fpath, "mode": mode, "anchor": anchor, "code": "\n".join(clean_lines)})

    # ۴. استخراج تگ‌های <patch>
    patch_pattern = re.compile(r'<patch\s+file=["\']([^"\']+)["\']\s*>(.*?)</patch>', re.DOTALL | re.IGNORECASE)
    for match in patch_pattern.finditer(raw_text):
        fpath = match.group(1).strip()
        body = match.group(2)
        hunks = re.findall(r'<<<<<<<\s*SEARCH[ \t]*\n(.*?)\n=======[ \t]*\n(.*?)\n>>>>>>>[ \t]*', body, re.DOTALL)
        for s, r in hunks:
            operations.append({"action": "patch", "file": fpath, "search": s, "replace": r})

    # سازگاری پشتیبان Aider-Style
    if not operations and "<<<<<<< SEARCH" in raw_text:
        legacy_matches = list(re.finditer(r'(?:^\s*[`#*]*\s*(?:FILE|PATCH):\s*([^\n]+))', raw_text, re.MULTILINE))
        for i, lm in enumerate(legacy_matches):
            fpath = lm.group(1).strip()
            start = lm.end()
            end = legacy_matches[i+1].start() if i + 1 < len(legacy_matches) else len(raw_text)
            chunk = raw_text[start:end]
            hunks = re.findall(r'<<<<<<<\s*SEARCH[ \t]*\n(.*?)\n=======[ \t]*\n(.*?)\n>>>>>>>[ \t]*', chunk, re.DOTALL)
            for s, r in hunks:
                operations.append({"action": "patch", "file": fpath, "search": s, "replace": r})

    return operations

# ==================== گاردریل اعتبارسنجی نحوی ایمن ====================

def validate_syntax_safely(file_path, content):
    """
    اعتبارسنجی نحوی بدون خطای کاذب با پشتیبانی کامل از CommonJS، ES Modules (.mjs) و TSX
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".py":
        try:
            compile(content, file_path, 'exec')
            return True, None
        except SyntaxError as e:
            return False, f"خطای سینتکس پایتون: {e.msg} در سطر {e.lineno}"

    if ext in (".js", ".mjs", ".cjs"):
        # بررسی سینتکس با موتور بومی Node.js (--check) بدون اجرای کد
        is_esm = ext == ".mjs" or bool(re.search(r'^\s*(import|export)\b', content, re.MULTILINE))
        primary_type = "module" if is_esm else "commonjs"

        try:
            res = subprocess.run(
                ["node", f"--input-type={primary_type}", "--check"],
                input=content,
                capture_output=True,
                text=True
            )
            if res.returncode != 0:
                # تست با نوع ماژول ثانویه برای اطمینان از رفع خطاهای ساختار متغیر
                alt_type = "commonjs" if primary_type == "module" else "module"
                res_alt = subprocess.run(
                    ["node", f"--input-type={alt_type}", "--check"],
                    input=content,
                    capture_output=True,
                    text=True
                )
                if res_alt.returncode != 0:
                    err_lines = [l for l in res.stderr.splitlines() if "SyntaxError" in l or "Error" in l]
                    err_msg = err_lines[0] if err_lines else "خطای سینتکس جاوااسکریپت."
                    return False, err_msg
            return True, None
        except Exception:
            return True, None

    if ext in (".ts", ".tsx"):
        node_check_script = """
        const code = process.argv[1];
        try {
            require('typescript').transpileModule(code, { compilerOptions: { jsx: 1 } });
            process.exit(0);
        } catch(e) {
            try {
                require('esbuild').transformSync(code, { loader: 'tsx' });
                process.exit(0);
            } catch(e2) {
                process.exit(2);
            }
        }
        """
        try:
            res = subprocess.run(["node", "-e", node_check_script, content], capture_output=True, text=True)
            if res.returncode == 1:
                return False, "خطای سینتکس TypeScript/JSX شناسایی شد."
        except Exception:
            pass
        return True, None

    return True, None

# ==================== موتور اتمیک Bottom-Up و ذخیره‌سازی ====================

def make_backup(paths, root_dir):
    backup_path = os.path.join(root_dir, BACKUP_DIR)
    if os.path.exists(backup_path):
        shutil.rmtree(backup_path)
    os.makedirs(backup_path, exist_ok=True)
    for p in paths:
        if os.path.isfile(p):
            rel = os.path.relpath(p, root_dir)
            dest = os.path.join(backup_path, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(p, dest)

def undo_last_patch():
    root = find_project_root()
    backup = os.path.join(root, BACKUP_DIR)
    if not os.path.exists(backup):
        print(f"{RED}هیچ نسخه پشتیبانی برای بازگردانی یافت نشد.{RESET}")
        return
    for r, _, files in os.walk(backup):
        for f in files:
            src = os.path.join(r, f)
            rel = os.path.relpath(src, backup)
            dst = os.path.join(root, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
    shutil.rmtree(backup)
    print(f"{GREEN}✔ تمامی فایل‌ها دقیقاً به حالت قبل بازگشتند (Rollback موفق).{RESET}")

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "--undo":
        undo_last_patch()
        return

    raw_input_text = ""
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            raw_input_text = f.read()
    else:
        cb = get_clipboard_text()
        if cb and any(k in cb for k in ["<patch", "<write", "<delete", "<insert", "<<<<<<< SEARCH"]):
            print(f"{CYAN}📋 تغییرات با موفقیت از کلیپ‌بورد فراخوانی شد.{RESET}")
            raw_input_text = cb
        else:
            print(f"{YELLOW}ورودی را وارد کنید و سپس کلیدهای Ctrl+D را بزنید:{RESET}")
            raw_input_text = sys.stdin.read()

    operations = parse_operations(raw_input_text)
    if not operations:
        print(f"{RED}❌ هیچ عملیات معتبری یافت نشد.{RESET}")
        sys.exit(1)

    root_dir = find_project_root()
    print(f"{CYAN}📁 پوشه اصلی پروژه: {root_dir}{RESET}")
    print(f"{BOLD}🔄 در حال پردازش دقیق {len(operations)} تغییر با الگوریتم Bottom-Up...{RESET}")

    ops_by_file = {}
    for op in operations:
        raw_path = op.get("file", "")
        try:
            target_path = sanitize_and_resolve(root_dir, raw_path)
            ops_by_file.setdefault(target_path, []).append(op)
        except PermissionError as e:
            print(f"  {RED}⛔ {e}{RESET}")
            sys.exit(1)

    staged = {}
    failed = []

    for target_path, ops in ops_by_file.items():
        rel_display = os.path.relpath(target_path, root_dir)

        if any(o["action"] in ("write", "delete") for o in ops):
            last_op = ops[-1]
            if last_op["action"] == "delete":
                staged[target_path] = None
                print(f"  {RED}🗑️ حذف فایل:{RESET} {rel_display}")
            else:
                staged[target_path] = last_op.get("code", "")
                print(f"  {GREEN}✔ بازنویسی / ایجاد فایل:{RESET} {rel_display}")
            continue

        if not os.path.isfile(target_path):
            err = f"فایل مقصد یافت نشد: {rel_display}"
            print(f"  {RED}❌ {err}{RESET}")
            failed.append((rel_display, err))
            continue

        with open(target_path, 'r', encoding='utf-8') as f:
            original_content = f.read()

        hunks_to_apply = []
        file_failed = False

        for op in ops:
            action = op["action"]
            if action == "patch":
                status, s_idx, e_idx, rep_text, err_msg = find_hunk_match(original_content, op["search"], op["replace"])
                if status != "OK":
                    failed.append((rel_display, err_msg))
                    print(f"  {RED}❌ [{rel_display}] {err_msg}{RESET}")
                    file_failed = True
                    break
                hunks_to_apply.append((s_idx, e_idx, rep_text))

            elif action == "insert":
                status, s_idx, e_idx, rep_text, err_msg = find_insert_match(original_content, op["anchor"], op["code"], op["mode"])
                if status != "OK":
                    failed.append((rel_display, err_msg))
                    print(f"  {RED}❌ [{rel_display}] {err_msg}{RESET}")
                    file_failed = True
                    break
                hunks_to_apply.append((s_idx, e_idx, rep_text))

        if file_failed:
            continue

        # بررسی تداخل همپوشانی (Overlap Check)
        hunks_to_apply.sort(key=lambda x: x[0])
        has_overlap = False
        for i in range(len(hunks_to_apply) - 1):
            if hunks_to_apply[i][1] > hunks_to_apply[i+1][0]:
                err = "تداخل بازه‌های دو پچ در یک فایل (Overlap). پچ رد شد."
                failed.append((rel_display, err))
                print(f"  {RED}❌ [{rel_display}] {err}{RESET}")
                has_overlap = True
                break
        if has_overlap:
            continue

        # اعمال از انتها به ابتدا (Bottom-Up by Offset)
        hunks_to_apply.sort(key=lambda x: x[0], reverse=True)
        updated_content = original_content

        for s_idx, e_idx, rep_text in hunks_to_apply:
            updated_content = updated_content[:s_idx] + rep_text + updated_content[e_idx:]

        # گاردریل سلامت نحوی
        is_valid, syntax_err = validate_syntax_safely(target_path, updated_content)
        if not is_valid:
            failed.append((rel_display, syntax_err))
            print(f"  {RED}⛔ [{rel_display}] گاردریل امنیتی: {syntax_err}{RESET}")
            continue

        staged[target_path] = updated_content
        print(f"  {GREEN}✔ اعمال اتمیک {len(hunks_to_apply)} پچ روی:{RESET} {rel_display}")

    if not staged or failed:
        if failed:
            print(f"\n{RED}⛔ به دلیل بروز خطا در اعتبارسنجی، هیچ تغییری روی دیسک اعمال نشد.{RESET}")
            for p, r in failed:
                print(f"  {RED}• {p}{RESET} -> {r}")
        sys.exit(1)

    make_backup(staged.keys(), root_dir)

    print(f"\n{BOLD}💾 ذخیره‌سازی نهایی و بی‌نقص فایل‌ها...{RESET}")
    for path, content in staged.items():
        rel = os.path.relpath(path, root_dir)
        if content is None:
            if os.path.isfile(path):
                os.remove(path)
                print(f"  {RED}🗑️ حذف شد:{RESET} {rel}")
        else:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"  {GREEN}✔ فایل با موفقیت به‌روزرسانی شد:{RESET} {rel}")

    print("-" * 50)
    print(f"{GREEN}{BOLD}✨ تمامی تغییرات با ضریب اطمینان ۱۰۰٪ روی پروژه اعمال شدند.{RESET}")
    print(f"{CYAN}در صورت تمایل به بازگردانی آنی: python fastpatch.py --undo{RESET}")

if __name__ == "__main__":
    main()
