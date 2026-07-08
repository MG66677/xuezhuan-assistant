#!/usr/bin/env python3
"""
PDF 报告生成器
用途：从 Excel/CSV 数据生成专业 PDF 报告
接单价格：¥200-1000/单
"""
import sys, os, json
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                 TableStyle, PageBreak, Image)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def generate_report(data_file, output, title="数据分析报告", author="数据工坊"):
    """生成 PDF 报告"""
    # 读取数据
    data = []
    if data_file.endswith(".json"):
        import json
        with open(data_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif data_file.endswith(".csv"):
        import csv
        with open(data_file, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            data = list(reader)
    elif data_file.endswith(".xlsx"):
        import pandas as pd
        df = pd.read_excel(data_file)
        data = df.to_dict("records")

    if not data:
        return {"error": "无数据"}

    doc = SimpleDocTemplate(
        output, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm
    )
    styles = getSampleStyleSheet()
    story = []

    # 标题页
    title_style = ParagraphStyle("Title2", parent=styles["Title"],
                                  fontSize=26, spaceAfter=10,
                                  textColor=colors.HexColor("#4F6EF7"))
    story.append(Spacer(1, 5*cm))
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 1*cm))
    story.append(Paragraph(f"生成日期: {datetime.now().strftime('%Y-%m-%d %H:%M')}", styles["Normal"]))
    story.append(Paragraph(f"数据来源: {os.path.basename(data_file)}", styles["Normal"]))
    story.append(Paragraph(f"数据条数: {len(data)}", styles["Normal"]))
    story.append(PageBreak())

    # 摘要
    story.append(Paragraph("摘要", styles["Heading1"]))
    story.append(Spacer(1, 0.3*cm))
    if data and isinstance(data[0], dict):
        keys = list(data[0].keys())
        stats = []
        for k in keys:
            vals = [row.get(k, "") for row in data if row.get(k, "") != ""]
            stats.append(f"• {k}: {len(vals)} 个有效值")
        for s in stats[:15]:
            story.append(Paragraph(s, styles["Normal"]))
    story.append(Spacer(1, 0.5*cm))

    # 数据表格
    story.append(Paragraph("数据详情", styles["Heading1"]))
    story.append(Spacer(1, 0.3*cm))

    if data and isinstance(data[0], dict):
        headers = list(data[0].keys())[:10]  # 最多10列
        table_data = [headers]
        for row in data[:50]:  # 最多50行
            table_data.append([str(row.get(h, ""))[:20] for h in headers])

        col_width = min(16*cm / len(headers), 4*cm)
        t = Table(table_data, colWidths=[col_width] * len(headers),
                   repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4F6EF7")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F0F4FF")]),
        ]))
        story.append(t)

    if len(data) > 50:
        story.append(Paragraph(f"... 及其他 {len(data) - 50} 行数据", styles["Normal"]))

    # 页脚
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(f"本报告由数据工坊自动生成 - {datetime.now().strftime('%Y-%m-%d')}",
                          ParagraphStyle("Footer", parent=styles["Normal"],
                                         fontSize=8, textColor=colors.grey,
                                         alignment=TA_CENTER)))

    doc.build(story)
    return {"success": True, "pages": "~", "file": os.path.abspath(output)}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "用法: pdf_report.py <数据文件> [输出路径] [标题]"}))
        return
    data_file = sys.argv[1]
    output = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(data_file), "report.pdf")
    title = sys.argv[3] if len(sys.argv) > 3 else "数据分析报告"
    result = generate_report(data_file, output, title)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
