from pathlib import Path
p = Path('tool/upgrade_maket.py')
s = p.read_text(encoding='utf-8')
s = s.replace("\\n double _max", "\\ndouble _max")
p.write_text(s, encoding='utf-8')
print('Prepared Maket upgrade pattern v2')
