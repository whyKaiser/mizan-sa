"""Visual QA contact sheets and PDF bounds checks, not a replacement for review."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import fitz
root=Path(__file__).resolve().parents[1]
scratch=root/'tmp'/'pdfs'
images=sorted(scratch.glob('guide-*.png'))
for batch in range(0,len(images),9):
    sheet=Image.new('RGB',(1125,1620),'#d9dfd7')
    draw=ImageDraw.Draw(sheet)
    for i,path in enumerate(images[batch:batch+9]):
        im=Image.open(path).convert('RGB')
        im.thumbnail((355,505))
        x=(i%3)*375+10;y=(i//3)*540+22
        sheet.paste(im,(x,y))
        draw.text((x,y-17),f'Page {batch+i+1}',fill='black')
    sheet.save(scratch/f'contact-{batch//9+1}.png')
pdf=fitz.open(root/'output/pdf/Mizan-study-guide.pdf')
problems=[]
for index,page in enumerate(pdf):
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            for span in line.get('spans',[]):
                x0,y0,x1,y1=span['bbox']
                if x0<15 or x1>page.rect.width-15 or y0<10 or y1>page.rect.height-10:
                    problems.append((index+1,span['text'][:70],span['bbox']))
print({'pages':len(pdf),'bounds_problems':problems,'size_bytes':(root/'output/pdf/Mizan-study-guide.pdf').stat().st_size})
