#!/usr/bin/env python3
"""Convert Claude Design .dc.html artboards into React (JSX) page modules.

Usage: convert.py <src_dir> <out_dir> <assetmap.txt>
"""
import json, re, sys
from html.parser import HTMLParser

SRC, OUT, AMAP = sys.argv[1], sys.argv[2], sys.argv[3]
PAGES = ['Main', 'Boutique', 'Atelier', 'Contact', 'ProduitMan', 'Paiement']
ASSETS = dict(l.split() for l in open(AMAP) if l.strip())

VOID = {'img', 'input', 'br', 'hr', 'meta', 'link', 'source', 'circle', 'path', 'rect'}
ATTR_MAP = {
    'class': 'className', 'for': 'htmlFor', 'viewbox': 'viewBox', 'stroke-width': 'strokeWidth',
    'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin', 'fill-rule': 'fillRule',
    'clip-rule': 'clipRule', 'autocomplete': 'autoComplete', 'inputmode': 'inputMode',
    'tabindex': 'tabIndex', 'maxlength': 'maxLength', 'readonly': 'readOnly',
    'onclick': 'onClick', 'onchange': 'onChange', 'oninput': 'onInput',
    'onmouseenter': 'onMouseEnter', 'onmouseleave': 'onMouseLeave', 'onsubmit': 'onSubmit',
}
HOLE = re.compile(r'\{\{\s*([^}]*?)\s*\}\}')


def fix_assets(s):
    return re.sub(r'/_blob/([0-9a-f]{32})', lambda m: '/img/' + ASSETS[m.group(1)] + '.webp', s)


class Node:
    def __init__(self, tag, attrs):
        self.tag, self.attrs, self.children = tag, attrs, []


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node('#root', [])
        self.stack = [self.root]
        self.in_xdc = False
        self.script = None
        self.cur_script = False
        self.css = []
        self.in_style = False

    def handle_starttag(self, tag, attrs):
        if tag == 'x-dc':
            self.in_xdc = True
            return
        if tag == 'script' and dict(attrs).get('type') == 'text/x-dc':
            self.cur_script = True
            return
        if tag == 'style':
            self.in_style = True
            return
        if not self.in_xdc or tag in ('helmet', 'link'):
            return
        n = Node(tag, attrs)
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_startendtag(self, tag, attrs):
        if not self.in_xdc or tag in ('helmet', 'link'):
            return
        self.stack[-1].children.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        if tag == 'x-dc':
            self.in_xdc = False
            return
        if tag == 'script':
            self.cur_script = False
            return
        if tag == 'style':
            self.in_style = False
            return
        if not self.in_xdc or tag in ('helmet', 'link') or tag in VOID:
            return
        assert self.stack[-1].tag == tag, (tag, self.stack[-1].tag)
        self.stack.pop()

    def handle_data(self, data):
        if self.cur_script:
            self.script = (self.script or '') + data
        elif self.in_style:
            self.css.append(data)
        elif self.in_xdc:
            self.stack[-1].children.append(data)


def expr(path, scope):
    path = path.strip()
    if path in ('true', 'false', 'null') or re.fullmatch(r'-?\d+(\.\d+)?', path):
        return path
    parts = path.split('.')
    head = parts[0]
    base = head if head in scope else 'v.' + head
    return base + ''.join('?.' + p for p in parts[1:])


def interp(val, scope):
    """Attribute value -> JS expression string."""
    m = HOLE.fullmatch(val.strip())
    if m:
        return expr(m.group(1), scope)
    if not HOLE.search(val):
        return json.dumps(val, ensure_ascii=False)
    out, last = '`', 0
    for m in HOLE.finditer(val):
        out += val[last:m.start()].replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
        out += '${' + expr(m.group(1), scope) + ' ?? ""}'
        last = m.end()
    out += val[last:].replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${') + '`'
    return out


def text(t, scope):
    t = re.sub(r'\s+', ' ', t)
    if t == '':
        return ''
    out, last = [], 0
    for m in HOLE.finditer(t):
        if t[last:m.start()]:
            out.append('{' + json.dumps(t[last:m.start()], ensure_ascii=False) + '}')
        out.append('{' + expr(m.group(1), scope) + '}')
        last = m.end()
    if t[last:]:
        out.append('{' + json.dumps(t[last:], ensure_ascii=False) + '}')
    return ''.join(out)


def comp_name(n):
    return n


def render(node, scope, imports):
    if isinstance(node, str):
        return text(node, scope)
    a = dict(node.attrs)
    kids = lambda sc: ''.join(render(c, sc, imports) for c in node.children)
    if node.tag == 'sc-for':
        var = a.get('as', 'item')
        lst = interp(a['list'], scope)
        sc = scope | {var, '$index'}
        return '{(' + lst + ' || []).map((' + var + ', $index) => (<React.Fragment key={$index}>' + kids(sc) + '</React.Fragment>))}'
    if node.tag == 'sc-if':
        return '{(' + interp(a['value'], scope) + ') ? (<>' + kids(scope) + '</>) : null}'
    if node.tag == 'dc-import':
        name = a['name']
        imports.add(name)
        props = []
        for k, val in node.attrs:
            if k in ('name',) or k.startswith('hint-'):
                continue
            key = re.sub(r'-([a-z])', lambda m: m.group(1).upper(), k)
            props.append(key + '={' + interp(val or '', scope) + '}')
        return '<' + name + ' ' + ' '.join(props) + ' />'
    tag = node.tag
    props = []
    has_change = any(k in ('onchange', 'oninput') for k, _ in node.attrs)
    for k, val in node.attrs:
        val = val if val is not None else ''
        if k.startswith('hint-'):
            continue
        if k == 'style':
            props.append('ref={S(' + interp(val, scope) + ')}')
            continue
        name = ATTR_MAP.get(k, k)
        if name == 'value' and tag in ('input', 'textarea') and not has_change:
            name = 'defaultValue'
        js = interp(val, scope)
        if name == 'href':
            js = 'R(' + js + ')'
            if val.startswith('http'):
                props.append('target="_blank" rel="noopener noreferrer"')
        props.append(name + '={' + js + '}')
    if tag == 'form':
        props.append('onSubmit={preventSubmit}')
    open_ = '<' + tag + (' ' + ' '.join(props) if props else '')
    if tag in VOID:
        return open_ + ' />'
    if tag == 'textarea':
        return open_ + ' />'
    return open_ + '>' + kids(scope) + '</' + tag + '>'


for page in PAGES:
    src = fix_assets(open(f'{SRC}/{page}.dc.html', encoding='utf-8').read())
    p = P()
    p.feed(src)
    imports = set()
    body = ''.join(render(c, set(), imports) for c in p.root.children)
    css = '\n'.join(p.css)
    js = p.script.strip()
    lines = ["import React from 'react';", "import { DCLogic, S, R, preventSubmit } from '../dc.js';"]
    for i in sorted(imports):
        lines.append(f"import {i} from './{i}.jsx';")
    lines.append('const CSS = ' + json.dumps(css, ensure_ascii=False) + ';')
    lines.append(js)
    lines.append('Component.template = (v) => (<><style>{CSS}</style>' + body + '</>);')
    lines.append('export default Component;')
    open(f'{OUT}/{page}.jsx', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')
    print(page, 'ok', sorted(imports))
