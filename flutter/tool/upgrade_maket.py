from pathlib import Path
import re

p = Path('lib/main.dart')
s = p.read_text(encoding='utf-8')
pattern = r'class MaketView extends StatelessWidget \{.*?\n double _max\(double a, double b\) => a > b \? a : b;'
replacement = r'''class MaketView extends StatefulWidget {
  const MaketView({super.key, required this.result, required this.topView, required this.onTop});

  final JsonMap result;
  final bool topView;
  final VoidCallback onTop;

  @override
  State<MaketView> createState() => _MaketViewState();
}

class _MaketViewState extends State<MaketView> {
  int mode = 0; // 0 = 2D, 1 = 3D
  bool roofVisible = true;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Maket Rumah', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 8),
        SegmentedButton<int>(
          segments: const [
            ButtonSegment(value: 0, icon: Icon(Icons.architecture), label: Text('2D Denah')),
            ButtonSegment(value: 1, icon: Icon(Icons.view_in_ar), label: Text('3D Maket')),
          ],
          selected: {mode},
          onSelectionChanged: (v) => setState(() => mode = v.first),
        ),
        const SizedBox(height: 10),
        if (mode == 0)
          Row(
            children: [
              const Icon(Icons.layers_clear_outlined, size: 18),
              const SizedBox(width: 6),
              const Expanded(child: Text('Denah 2D • tampak atas tanpa genteng')),
              IconButton(
                tooltip: 'Reset tampilan',
                onPressed: () => setState(() {}),
                icon: const Icon(Icons.refresh),
              ),
            ],
          )
        else
          Row(
            children: [
              const Expanded(child: Text('Maket 3D • genteng dapat ditampilkan/disembunyikan')),
              Switch(value: roofVisible, onChanged: (v) => setState(() => roofVisible = v)),
            ],
          ),
        const SizedBox(height: 6),
        SizedBox(
          height: 420,
          child: Card(
            clipBehavior: Clip.antiAlias,
            child: InteractiveViewer(
              minScale: .5,
              maxScale: 5,
              boundaryMargin: const EdgeInsets.all(80),
              child: mode == 0
                  ? CustomPaint(
                      size: const Size(380, 420),
                      painter: FloorPlan2DPainter(widget.result),
                    )
                  : CustomPaint(
                      size: const Size(380, 420),
                      painter: House3DPainter(widget.result, roofVisible),
                    ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        if (mode == 0)
          const Text('Pinch untuk zoom • geser untuk melihat seluruh denah • ukuran mengikuti dimensi proyek.')
        else
          const Text('Pinch untuk zoom • geser untuk memeriksa maket 3D dan melihat interior dengan atap disembunyikan.'),
      ],
    );
  }
}

class FloorPlan2DPainter extends CustomPainter {
  const FloorPlan2DPainter(this.result);
  final JsonMap result;

  @override
  void paint(Canvas canvas, Size size) {
    final geometry = Map<String, dynamic>.from(result['geometry'] as Map);
    final l = (geometry['length'] as num).toDouble();
    final w = (geometry['width'] as num).toDouble();
    final scale = math.min((size.width - 70) / l, (size.height - 100) / w);
    final rw = l * scale;
    final rh = w * scale;
    final left = (size.width - rw) / 2;
    final top = 42.0;
    final rect = Rect.fromLTWH(left, top, rw, rh);

    final bg = Paint()..color = const Color(0xFFF8FAFC);
    canvas.drawRect(Offset.zero & size, bg);

    final grid = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = .7;
    for (double x = rect.left; x <= rect.right; x += math.max(10, scale)) {
      canvas.drawLine(Offset(x, rect.top), Offset(x, rect.bottom), grid);
    }
    for (double y = rect.top; y <= rect.bottom; y += math.max(10, scale)) {
      canvas.drawLine(Offset(rect.left, y), Offset(rect.right, y), grid);
    }

    final wall = Paint()
      ..color = const Color(0xFF111827)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7;
    canvas.drawRect(rect, wall);

    final inner = Paint()
      ..color = const Color(0xFF475569)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    // A useful starter layout, kept proportional to the project rectangle.
    final x1 = rect.left + rect.width * .50;
    final y1 = rect.top + rect.height * .34;
    final y2 = rect.top + rect.height * .68;
    canvas.drawLine(Offset(x1, rect.top), Offset(x1, y2), inner);
    canvas.drawLine(Offset(rect.left, y1), Offset(rect.right, y1), inner);
    canvas.drawLine(Offset(rect.left, y2), Offset(x1, y2), inner);
    canvas.drawLine(Offset(x1, y2), Offset(x1, rect.bottom), inner);

    // Door openings / swing arcs.
    final door = Paint()
      ..color = const Color(0xFF2563EB)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final d = math.min(rect.width, rect.height) * .10;
    canvas.drawLine(Offset(rect.left, y2 - d), Offset(rect.left + d, y2 - d), door);
    canvas.drawArc(Rect.fromLTWH(rect.left, y2 - d, d * 2, d * 2), -math.pi / 2, math.pi / 2, false, door);
    canvas.drawLine(Offset(x1, y2), Offset(x1 + d, y2), door);
    canvas.drawArc(Rect.fromLTWH(x1, y2 - d, d * 2, d * 2), math.pi, math.pi / 2, false, door);

    // Windows.
    final win = Paint()
      ..color = const Color(0xFF0EA5E9)
      ..strokeWidth = 5;
    canvas.drawLine(Offset(rect.left + rw * .20, rect.top), Offset(rect.left + rw * .32, rect.top), win);
    canvas.drawLine(Offset(rect.right - rw * .32, rect.bottom), Offset(rect.right - rw * .18, rect.bottom), win);
    canvas.drawLine(Offset(rect.right, rect.top + rh * .52), Offset(rect.right, rect.top + rh * .64), win);

    _label(canvas, 'DAPUR', Offset(rect.left + rw * .25, rect.top + rh * .17), 14);
    _label(canvas, 'KM / WC', Offset(rect.left + rw * .75, rect.top + rh * .17), 12);
    _label(canvas, 'KAMAR 02', Offset(rect.left + rw * .25, rect.top + rh * .49), 13);
    _label(canvas, 'RUANG KELUARGA', Offset(rect.left + rw * .75, rect.top + rh * .48), 12);
    _label(canvas, 'RUANG TAMU', Offset(rect.left + rw * .25, rect.top + rh * .82), 13);
    _label(canvas, 'KAMAR 01', Offset(rect.left + rw * .75, rect.top + rh * .82), 13);

    _dimension(canvas, Offset(rect.left, rect.bottom + 24), Offset(rect.right, rect.bottom + 24), '${l.toStringAsFixed(2)} m');
    _dimension(canvas, Offset(rect.right + 22, rect.top), Offset(rect.right + 22, rect.bottom), '${w.toStringAsFixed(2)} m');
    _label(canvas, 'UTARA ↑', Offset(size.width / 2, 18), 11);
  }

  void _label(Canvas canvas, String text, Offset center, double size) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: const Color(0xFF0F172A), fontSize: size, fontWeight: FontWeight.w700)),
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: 150);
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  void _dimension(Canvas canvas, Offset a, Offset b, String text) {
    final p = Paint()..color = const Color(0xFF64748B)..strokeWidth = 1.4;
    canvas.drawLine(a, b, p);
    final mid = Offset((a.dx + b.dx) / 2, (a.dy + b.dy) / 2);
    final tp = TextPainter(
      text: TextSpan(text: text, style: const TextStyle(color: Color(0xFF334155), fontSize: 11, fontWeight: FontWeight.w600)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, mid - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant FloorPlan2DPainter oldDelegate) => oldDelegate.result != result;
}

class House3DPainter extends CustomPainter {
  const House3DPainter(this.result, this.roofVisible);
  final JsonMap result;
  final bool roofVisible;

  @override
  void paint(Canvas canvas, Size size) {
    final g = Map<String, dynamic>.from(result['geometry'] as Map);
    final l = (g['length'] as num).toDouble();
    final w = (g['width'] as num).toDouble();
    final scale = math.min((size.width - 90) / (l + w), (size.height - 120) / (l + w));
    final ox = size.width / 2;
    final oy = 115.0;
    final sx = scale;
    final sy = scale * .48;
    final wallH = math.min(120.0, size.height * .28);

    final ground = Paint()..color = const Color(0xFFE2E8F0);
    final floor = Paint()..color = const Color(0xFFF1F5F9);
    final wall = Paint()..color = const Color(0xFFE5E7EB);
    final side = Paint()..color = const Color(0xFFCBD5E1);
    final roof = Paint()..color = const Color(0xFF94A3B8);

    Offset iso(double x, double y, double z) => Offset(ox + (x - y) * sx, oy + (x + y) * sy - z);
    final p00 = iso(0, 0, 0);
    final p10 = iso(l, 0, 0);
    final p11 = iso(l, w, 0);
    final p01 = iso(0, w, 0);
    final t00 = iso(0, 0, wallH);
    final t10 = iso(l, 0, wallH);
    final t11 = iso(l, w, wallH);
    final t01 = iso(0, w, wallH);

    canvas.drawPath(Path()..addPolygon([Offset(0, size.height), Offset(size.width, size.height), p11, p01, p00, p10], true), ground);
    canvas.drawPath(Path()..addPolygon([p00, p10, p11, p01], true), floor);
    canvas.drawPath(Path()..addPolygon([p00, p10, t10, t00], true), wall);
    canvas.drawPath(Path()..addPolygon([p10, p11, t11, t10], true), side);
    canvas.drawPath(Path()..addPolygon([p01, p11, t11, t01], true), side);
    canvas.drawPath(Path()..addPolygon([p00, p01, t01, t00], true), wall);

    if (roofVisible) {
      final ridgeZ = wallH + math.max(45, math.min(85, math.min(l, w) * scale * .42));
      final r0 = iso(l / 2, 0, ridgeZ);
      final r1 = iso(l / 2, w, ridgeZ);
      canvas.drawPath(Path()..addPolygon([t00, t10, r0], true), roof);
      canvas.drawPath(Path()..addPolygon([t01, t11, r1], true), roof);
      canvas.drawPath(Path()..addPolygon([t00, t01, r1, r0], true), roof);
      canvas.drawPath(Path()..addPolygon([t10, t11, r1, r0], true), roof);
    } else {
      final edge = Paint()..color = const Color(0xFF64748B)..style = PaintingStyle.stroke..strokeWidth = 2;
      canvas.drawPath(Path()..addPolygon([t00, t10, t11, t01], true), edge);
      _label(canvas, 'INTERIOR / ATAP DIBUKA', Offset(size.width / 2, size.height - 28), 11);
    }

    _label(canvas, roofVisible ? 'MAKET 3D' : 'MAKET 3D • CUTAWAY ATAS', Offset(size.width / 2, 22), 15);
  }

  void _label(Canvas canvas, String text, Offset center, double size) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: const Color(0xFF0F172A), fontSize: size, fontWeight: FontWeight.w700)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant House3DPainter oldDelegate) => oldDelegate.roofVisible != roofVisible || oldDelegate.result != result;
}

double _max(double a, double b) => a > b ? a : b;'''

new_s, n = re.subn(pattern, replacement, s, flags=re.S)
if n != 1:
    raise SystemExit(f'expected exactly one maket block, found {n}')
p.write_text(new_s, encoding='utf-8')
print('Maket 2D + 3D upgrade applied')
