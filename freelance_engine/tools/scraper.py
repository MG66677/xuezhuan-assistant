#!/usr/bin/env python3
"""
数据采集器 - Web Scraper
用途：通用网页数据采集，输出 CSV / Excel / JSON
接单价格：¥100-500/单
"""
import sys, os, json, csv, re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def fetch_page(url):
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        r = requests.get(url, headers=headers, timeout=15)
        r.encoding = r.apparent_encoding or "utf-8"
        return r.text
    except Exception as e:
        return {"error": str(e)}

def parse_html(html, selector, extract="text"):
    """用 CSS 选择器提取内容"""
    soup = BeautifulSoup(html, "html.parser")
    results = []
    for el in soup.select(selector):
        if extract == "text":
            results.append(el.get_text(strip=True))
        elif extract == "html":
            results.append(str(el))
        elif extract == "href":
            results.append(el.get("href", ""))
        elif extract == "src":
            results.append(el.get("src", ""))
        elif extract == "all":
            results.append({
                "text": el.get_text(strip=True),
                "html": str(el)[:500],
                "href": el.get("href", ""),
                "src": el.get("src", "")
            })
    return results

def extract_table(html, table_index=0):
    """提取 HTML 表格"""
    soup = BeautifulSoup(html, "html.parser")
    tables = soup.find_all("table")
    if not tables or table_index >= len(tables):
        return []
    table = tables[table_index]
    rows = []
    for tr in table.find_all("tr"):
        cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
        if cells:
            rows.append(cells)
    return rows

def extract_links(html, base_url="", filter_pattern=""):
    """提取页面所有链接"""
    soup = BeautifulSoup(html, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = a.get_text(strip=True)
        full_url = urljoin(base_url, href)
        if filter_pattern and filter_pattern not in href:
            continue
        links.append({"text": text, "url": full_url})
    return links

def save_csv(data, filename, headers=None):
    with open(filename, "w", newline="", encoding="utf-8-sig") as f:
        if isinstance(data, list) and data and isinstance(data[0], list):
            writer = csv.writer(f)
            if headers:
                writer.writerow(headers)
            writer.writerows(data)
        elif isinstance(data, list) and data and isinstance(data[0], dict):
            writer = csv.DictWriter(f, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
        else:
            f.write("\n".join(data) if isinstance(data, list) else str(data))

def save_excel(data, filename):
    import openpyxl
    wb = openpyxl.Workbook()
    ws = wb.active
    if isinstance(data, list) and data:
        if isinstance(data[0], dict):
            ws.append(list(data[0].keys()))
            for row in data:
                ws.append(list(row.values()))
        elif isinstance(data[0], list):
            for row in data:
                ws.append(row)
        else:
            for item in data:
                ws.append([item])
    wb.save(filename)

def save_json(data, filename):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: scraper.py <url> [selector] [format]"}))
        return

    url = sys.argv[1]
    selector = sys.argv[2] if len(sys.argv) > 2 else "body"
    fmt = sys.argv[3] if len(sys.argv) > 3 else "json"

    html = fetch_page(url)
    if isinstance(html, dict) and "error" in html:
        print(json.dumps(html))
        return

    data = parse_html(html, selector)
    out_dir = sys.argv[4] if len(sys.argv) > 4 else os.path.join(os.path.dirname(__file__), "..", "output")
    os.makedirs(out_dir, exist_ok=True)

    base = re.sub(r"[^\w]", "_", url[:30])
    if fmt == "csv":
        path = os.path.join(out_dir, f"{base}.csv")
        save_csv(data, path)
    elif fmt == "excel":
        path = os.path.join(out_dir, f"{base}.xlsx")
        save_excel(data, path)
    elif fmt == "json":
        path = os.path.join(out_dir, f"{base}.json")
        save_json(data, path)

    print(json.dumps({"success": True, "count": len(data), "file": path, "data": data[:20]}))

if __name__ == "__main__":
    main()
