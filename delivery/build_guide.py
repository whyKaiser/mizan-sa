"""Build the Arabic Mizan study guide from its editable Markdown source."""
from pathlib import Path
import re
import textwrap
import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
FONT_DIR = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Arabic', str(FONT_DIR / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('ArabicBold', str(FONT_DIR / 'arialbd.ttf')))
W, H = A4
M = 48
GREEN = HexColor('#28523e')
CREAM = HexColor('#f5f1e7')
SAND = HexColor('#b49e6c')
INK = HexColor('#293b33')
MUTED = HexColor('#617168')

def visual(text):
    return get_display(arabic_reshaper.reshape(text))

def width(text, font='Arabic', size=13):
    return pdfmetrics.stringWidth(visual(text), font, size)

def wrap(text, max_width=W-2*M, size=13, font='Arabic'):
    words = text.split()
    lines, line = [], ''
    for word in words:
        candidate = f'{line} {word}'.strip()
        if line and width(candidate, font, size) > max_width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pages = []

    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self.pages)
        for state in self.pages:
            self.__dict__.update(state)
            self.setStrokeColor(HexColor('#ddd9ce'))
            self.line(M, 39, W-M, 39)
            self.setFont('Arabic', 9)
            self.setFillColor(MUTED)
            self.drawRightString(W-M, 24, visual('ميزان | دليل الفهم والمناقشة'))
            self.setFont('Helvetica', 9)
            self.drawString(M, 24, f'{self._pageNumber} / {total}')
            super().showPage()
        super().save()

class Guide:
    def __init__(self):
        self.c = NumberedCanvas(str(OUT / 'Mizan-study-guide.pdf'), pagesize=A4)
        self.c.setTitle('ميزان - دليل الفهم والتشغيل والمناقشة')
        self.c.setAuthor('ميزان')
        self.c.setSubject('دليل تعليمي مرتبط بالمصدر والاختبارات')
        self.y = H-M
        self.title = ''
        self.chapter = 0
        self.started = False
        self.overflow_pages = 0

    def page(self, title, chapter, continued=False):
        if self.started:
            self.c.showPage()
        self.started = True
        self.title, self.chapter = title, chapter
        self.c.setFillColor(CREAM)
        self.c.rect(0, 0, W, H, fill=1, stroke=0)
        self.c.setFillColor(GREEN)
        self.c.rect(0, H-17, W, 17, fill=1, stroke=0)
        self.c.setFont('Arabic', 10)
        self.c.setFillColor(MUTED)
        self.c.drawRightString(W-M, H-44, visual('تخطيط • تحليل • محاكاة • نجاح'))
        self.c.setFillColor(SAND)
        self.c.setFont('Helvetica-Bold', 11)
        self.c.drawString(M, H-44, f'{chapter:02d}')
        if chapter == 1 and not continued:
            cx, cy = W/2, H-144
            self.c.setFillColor(GREEN)
            self.c.roundRect(cx-43, cy-40, 86, 86, 18, fill=1, stroke=0)
            self.c.setStrokeColor(CREAM)
            self.c.setLineWidth(2.5)
            self.c.line(cx,cy-21,cx,cy+25)
            self.c.line(cx-16,cy-22,cx+16,cy-22)
            self.c.line(cx-29,cy+12,cx+29,cy+17)
            for x,y in [(cx-25,cy+13),(cx+25,cy+17)]:
                self.c.line(x,y,x-12,cy-9)
                self.c.line(x,y,x+12,cy-9)
                self.c.line(x-12,cy-9,x+12,cy-9)
                self.c.arc(x-12,cy-16,x+12,cy,180,180)
            self.c.setFillColor(GREEN)
            self.c.setFont('ArabicBold',44)
            self.c.drawCentredString(cx,H-246,visual('ميزان'))
            self.c.setStrokeColor(SAND)
            self.c.line(M,H-267,W-M,H-267)
            self.y=H-298
            return
        self.y = H-83
        self.paragraph(title + (' - متابعة' if continued else ''), size=23, font='ArabicBold', lead=32, color=GREEN, gap=14)
        self.c.setStrokeColor(SAND)
        self.c.line(M, self.y+1, W-M, self.y+1)
        self.y -= 17

    def ensure(self, height):
        if self.y-height < 59:
            self.overflow_pages += 1
            self.page(self.title, self.chapter, True)

    def paragraph(self, text, size=13, font='Arabic', lead=21, color=INK, gap=10):
        lines = wrap(text, size=size, font=font)
        self.ensure(len(lines)*lead+gap)
        self.c.setFillColor(color)
        self.c.setFont(font, size)
        for line in lines:
            self.c.drawRightString(W-M, self.y, visual(line))
            self.y -= lead
        self.y -= gap

    def heading(self, text):
        self.ensure(70)
        self.paragraph(text, size=15, font='ArabicBold', lead=23, color=GREEN, gap=3)

    def code(self, text):
        # Keep source code left-to-right; wrap long references without truncation.
        lines = []
        for line in text.splitlines():
            lines.extend(textwrap.wrap(line, width=86, replace_whitespace=False,
                                       drop_whitespace=False) or [''])
        height = len(lines)*13 + 22
        self.ensure(height + 8)
        self.c.setFillColor(HexColor('#e6ece6'))
        self.c.roundRect(M, self.y-height+8, W-2*M, height, 7, stroke=0, fill=1)
        self.c.setFillColor(INK)
        self.c.setFont('Courier', 9)
        y = self.y-8
        for line in lines:
            self.c.drawString(M+12, y, line)
            y -= 13
        self.y -= height+10

    def finish(self):
        self.c.showPage()
        self.c.save()

def main():
    guide = Guide()
    source = (ROOT/'delivery'/'study-guide.md').read_text(encoding='utf-8')
    chapters = re.split(r'^# ', source, flags=re.M)[1:]
    for number, chapter in enumerate(chapters, 1):
        title, body = chapter.split('\n', 1)
        guide.page(title.strip(), number)
        code = None
        for line in body.splitlines():
            if line.startswith('```'):
                if code is None:
                    code = []
                else:
                    guide.code('\n'.join(code))
                    code = None
            elif code is not None:
                code.append(line)
            elif line.startswith('## '):
                guide.heading(line[3:].strip())
            elif line.strip():
                guide.paragraph(line.strip())
    guide.finish()
    print(f'Created {len(chapters)} chapters; continuation pages: {guide.overflow_pages}')
    print(OUT/'Mizan-study-guide.pdf')

if __name__ == '__main__':
    main()
