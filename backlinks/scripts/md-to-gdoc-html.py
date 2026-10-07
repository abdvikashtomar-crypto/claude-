"""Turn a guest post Markdown file into simple HTML for a Google Doc import.
Images point at the public Shopify CDN copies of the infographics."""
import re, sys, html
CDN = {
 'women-artisans.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-women-artisans-india.png?v=1791220547',
 'embroidery-exports.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-india-embroidery-exports-2024-25.png?v=1791220546',
 'hours-per-piece.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-hand-vs-machine-embroidery-hours.png?v=1791220547',
 'reddit-comments.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-reddit-comments-embroidered-clothes.png?v=1791220547',
 'hand-vs-machine.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-how-to-tell-hand-vs-machine-embroidery.png?v=1791220547',
 'care-guide.png': 'https://cdn.shopify.com/s/files/1/0649/3283/9609/files/vee-threads-infographic-how-to-wash-hand-embroidered-clothes.png?v=1791220547',
}
src = re.sub(r'<!--.*?-->', '', open(sys.argv[1]).read(), flags=re.S).strip()
def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<i>\1</i>', t)
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', t)
out, lines, i = [], src.split('\n'), 0
while i < len(lines):
    ln = lines[i]
    if ln.startswith('# '): out.append(f'<h1>{inline(ln[2:])}</h1>')
    elif ln.startswith('## '): out.append(f'<h2>{inline(ln[3:])}</h2>')
    elif m := re.match(r'!\[([^\]]*)\]\(([^)]+)\)', ln):
        url = CDN[m.group(2)]
        out.append(f'<p><img src="{url}&width=1200" alt="{html.escape(m.group(1))}" width="600"></p><p><i>Full-size image: {url}</i></p>')
    elif re.match(r'\d+\. ', ln):
        items = []
        while i < len(lines) and re.match(r'\d+\. ', lines[i]):
            items.append('<li>' + inline(re.sub(r'^\d+\. ', '', lines[i])) + '</li>'); i += 1
        out.append('<ol>' + ''.join(items) + '</ol>'); continue
    elif ln.startswith('- '):
        items = []
        while i < len(lines) and lines[i].startswith('- '):
            items.append('<li>' + inline(lines[i][2:]) + '</li>'); i += 1
        out.append('<ul>' + ''.join(items) + '</ul>'); continue
    elif ln.strip() and ln.strip() != '---':
        out.append(f'<p>{inline(ln)}</p>')
    i += 1
print('<html><body>' + '\n'.join(out) + '</body></html>')
