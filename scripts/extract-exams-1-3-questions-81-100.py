"""Extract questions 81-100 of Exames I, II and III (the only 100-question exams; the
original import stopped at 80) plus their answer keys.

The PDFs are the provaUrl/gabaritoUrl of exams 1-3 in scripts/full-pipeline.js, saved
as I-prova.pdf, I-gab.pdf, II-prova.pdf, ... in one folder.

Usage: python scripts/extract-exams-1-3-questions-81-100.py <pdf folder> scripts/data/exams-1-3-questions-81-100.json
Then:  node scripts/build-exams-1-3-questions-81-100.js"""
import json, re, sys
from pathlib import Path
import pymupdf

D = Path(sys.argv[1])

def text(name):
    t = '\n'.join(p.get_text() for p in pymupdf.open(D / name))
    # Drop the optional survey printed after the last question
    return re.split(r'QUESTIONÁRIO DE PERCEPÇÃO|CRONOGRAMA OPERACIONAL', t, flags=re.I)[0]

def collapse(s):
    s = s.replace('­', '')
    s = re.sub(r'-\s*\n\s*', '-', s)  # line breaks after a hyphen are real hyphens (Dirige-se, pré-escola)
    return re.sub(r'\s+', ' ', s).strip()

def fix_ligatures(s):
    s = s.replace('ﬁ ', 'fi').replace('ﬁ', 'fi').replace('ﬂ ', 'fl').replace('ﬂ', 'fl')
    # Exame II PDF splits the "ti" ligature: "normati vo", "consti tucional"
    s = re.sub(r'ti[ \t]*\n?[ \t]*(?=[a-záàâãéêíóôõúç])', 'ti', s)
    # ...and the accented ones: "compatí vel", "benefí cio", "lití gio"
    return re.sub(r'([tf]í)[ \t]+(?=[a-záàâãéêíóôõúç])', r'\1', s)

def split_alts(block, pattern):
    parts = re.split(pattern, block)
    # parts: [statement, 'A', textA, 'B', textB, ...]
    stmt, rest = parts[0], parts[1:]
    letters = rest[0::2]
    assert letters == ['A', 'B', 'C', 'D'], letters
    return collapse(stmt), {l.lower(): collapse(t) for l, t in zip(letters, rest[1::2])}

out = {}

# ── Exame I (CESPE 2010.1): "QUESTÃO N", alternatives are a lone letter line ──
t = text('I-prova.pdf')
t = re.sub(r'\nOAB – Exame de Ordem 2010\.1\s*\n(Caderno [A-Z ]+\s*\n)?\s*– \d+ –\s*\n', '\n', t)
blocks = re.split(r'\nQUESTÃO (\d+)\n', t)
qs = {int(n): b for n, b in zip(blocks[1::2], blocks[2::2])}
out['I'] = {}
for n in range(81, 101):
    out['I'][n] = split_alts(qs[n], r'\n([ABCD])\n')

# ── Exame II (FGV 2010.2): "NN \nA0xxxx\n" before the statement, "(A)" alternatives ──
t = fix_ligatures(text('II-prova.pdf'))
t = t.replace('www.questoesdeconcursos.com.br', '')
t = re.sub(r'\nCaderno de Prova 01\s*\n– \d+ –\s*\nOAB – Exame de Ordem Unificado 2010\.2\s*\n', '\n', t)
blocks = re.split(r'\n(\d{1,3}) ?\n[A-Z]\d{5}\n', '\n' + t)
qs = {int(n): b for n, b in zip(blocks[1::2], blocks[2::2])}
out['II'] = {}
for n in range(81, 101):
    out['II'][n] = split_alts(qs[n], r'\(([ABCD])\)')

# ── Exame III (FGV 2010.3, tipo 1 branco): number alone on a line, "(A)" alternatives ──
t = text('III-prova.pdf')
t = re.sub(r'EXAME DE ORDEM UNIFICADO 2010\.3 – TIPO 1 – BRANCO\s*\nPágina \d+\s*\n', '\n', t)
start = t.index('\n81 \n')
blocks = re.split(r'\n(\d{2,3}) ?\n', t[start:])
qs = {int(n): b for n, b in zip(blocks[1::2], blocks[2::2]) if 81 <= int(n) <= 100}
out['III'] = {}
for n in range(81, 101):
    out['III'][n] = split_alts(qs[n], r'\(([ABCD])\)')

# ── Answer keys ──
def key_from_columns(t):
    # Tables come out as runs of 20 numbers followed by 20 letters
    toks = [x.strip() for x in t.split('\n') if x.strip()]
    key = {}
    i = 0
    while i < len(toks):
        if toks[i].isdigit() and i + 40 <= len(toks):
            nums = toks[i:i + 20]
            lets = toks[i + 20:i + 40]
            if all(x.isdigit() for x in nums) and all(re.fullmatch(r'[ABCD*X]|Anulada|NULA', x) for x in lets):
                for a, b in zip(nums, lets):
                    key.setdefault(int(a), b)
                i += 40
                continue
        i += 1
    return key

keyI = key_from_columns(text('I-gab.pdf'))
keyIII = key_from_columns(text('III-gab.pdf').split('TIPO 2')[0])
keyII = {int(n): l for n, l in re.findall(r'(\d{3}) [–-] ([ABCD])', text('II-gab.pdf'))}
annulled_I = {2, 11, 24, 31, 33}  # CESPE communiqué in the answer-key PDF (none in 81-100)

result = []
for exam, key in (('I', keyI), ('II', keyII), ('III', keyIII)):
    for n in range(81, 101):
        stmt, alts = out[exam][n]
        result.append({'exam': exam, 'number': n, 'statement': stmt, 'alternatives': alts, 'correct': key[n].lower()})
    print(exam, 'key 1-80:', ''.join(key[i] for i in range(1, 81)))
json.dump(result, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(result), 'questions')
