from pathlib import Path
p = Path('tool/upgrade_maket.py')
s = p.read_text(encoding='utf-8')
s = s.replace(r"\\n double _max", r"\\ndouble _max")
p.write_text(s, encoding='utf-8')
print('Prepared Maket upgrade pattern')
