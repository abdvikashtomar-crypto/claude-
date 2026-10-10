import re,sys,zipfile
from xml.sax.saxutils import escape
src=re.sub(r'<!--.*?-->','',open(sys.argv[1]).read(),flags=re.S).strip()
def runs(t,size=24,bold=False):
    out=[]
    for i,part in enumerate(re.split(r'\*\*(.+?)\*\*',t)):
        if not part: continue
        b=bold or i%2==1
        out.append('<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>%s<w:sz w:val="%d"/></w:rPr><w:t xml:space="preserve">%s</w:t></w:r>'%('<w:b/>' if b else '',size,escape(part)))
    return ''.join(out)
P=[]
for line in src.split('\n'):
    l=line.strip()
    if not l or l=='---': continue
    if l.startswith('# '): P.append('<w:p>%s</w:p>'%runs(l[2:],36,True))
    elif l.startswith('## '): P.append('<w:p><w:pPr><w:spacing w:before="240"/></w:pPr>%s</w:p>'%runs(l[3:],28,True))
    elif l.startswith('- '): P.append('<w:p><w:pPr><w:ind w:left="360"/></w:pPr>%s</w:p>'%runs('• '+l[2:]))
    else: P.append('<w:p>%s</w:p>'%runs(l))
doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>%s</w:body></w:document>'%''.join(P)
ct='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'
rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'
with zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    z.writestr('[Content_Types].xml',ct); z.writestr('_rels/.rels',rels); z.writestr('word/document.xml',doc)
