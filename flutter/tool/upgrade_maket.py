from pathlib import Path
import re

p = Path('lib/main.dart')
s = p.read_text(encoding='utf-8')
pattern = r'class MaketView extends StatelessWidget \{.*?\n double _max\(double a, double b\) => a > b \? a : b;'
replacement = r'''class MaketView extends StatefulWidget {
  const MaketView({super.key, required this.result, this.initialLayout, this.onLayoutChanged});

  final JsonMap result;
  final Map<String, dynamic>? initialLayout;
  final void Function(double dx1, double dy1, double dy2)? onLayoutChanged;

  @override
  State<MaketView> createState() => _MaketViewState();
}

class _MaketViewState extends State<MaketView> {
  int mode = 0; // 0 = 2D, 1 = 3D
  bool roofVisible = true;
  bool editMode = false;
  double azimuth = -0.62;
  double elevation = .62;
  double zoom = 1.0;
  late double dx1 = (widget.initialLayout?['dx1'] as num?)?.toDouble() ?? .50;
  late double dy1 = (widget.initialLayout?['dy1'] as num?)?.toDouble() ?? .34;
  late double dy2 = (widget.initialLayout?['dy2'] as num?)?.toDouble() ?? .68;

  void _resetView() {
    setState(() {
      azimuth = -0.62;
      elevation = .62;
      zoom = 1.0;
    });
  }

  void _resetLayout() {
    setState(() {
      dx1 = .50;
      dy1 = .34;
      dy2 = .68;
    });
    widget.onLayoutChanged?.call(dx1, dy1, dy2);
  }

  void _dragDivider(Offset local, Size canvasSize, double l, double w) {
    final rect = FloorPlan2DPainter.rectFor(canvasSize, l, w);
    final x1 = rect.left + rect.width * dx1;
    final y1 = rect.top + rect.height * dy1;
    final y2 = rect.top + rect.height * dy2;
    final dHoriz1 = (local.dy - y1).abs();
    final dHoriz2 = (local.dy - y2).abs();
    final dVert = (local.dx - x1).abs();
    const threshold = 26.0;
    if (dVert < threshold && dVert <= dHoriz1 && dVert <= dHoriz2) {
      setState(() => dx1 = (((local.dx - rect.left) / rect.width)).clamp(.25, .75));
    } else if (dHoriz1 < threshold && dHoriz1 <= dHoriz2) {
      setState(() => dy1 = (((local.dy - rect.top) / rect.height)).clamp(.14, dy2 - .12));
    } else if (dHoriz2 < threshold) {
      setState(() => dy2 = (((local.dy - rect.top) / rect.height)).clamp(dy1 + .12, .88));
    }
    widget.onLayoutChanged?.call(dx1, dy1, dy2);
  }

  @override
  Widget build(BuildContext context) {
    final geometry = Map<String, dynamic>.from(widget.result['geometry'] as Map);
    final l = (geometry['length'] as num).toDouble();
    final w = (geometry['width'] as num).toDouble();
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
              const Icon(Icons.edit_outlined, size: 18),
              const SizedBox(width: 6),
              const Expanded(child: Text('Mode edit denah (geser garis sekat)')),
              Switch(value: editMode, onChanged: (v) => setState(() => editMode = v)),
            ],
          )
        else
          Row(
            children: [
              const Expanded(child: Text('Maket 3D • seret untuk memutar, cubit untuk zoom')),
              Switch(value: roofVisible, onChanged: (v) => setState(() => roofVisible = v)),
            ],
          ),
        const SizedBox(height: 6),
        SizedBox(
          height: 420,
          child: Card(
            clipBehavior: Clip.antiAlias,
            child: mode == 0
                ? (editMode
                    ? GestureDetector(
                        onPanUpdate: (d) => _dragDivider(d.localPosition, const Size(380, 420), l, w),
                        child: CustomPaint(
                          size: const Size(380, 420),
                          painter: FloorPlan2DPainter(widget.result, dx1, dy1, dy2, editable: true),
                        ),
                      )
                    : InteractiveViewer(
                        minScale: .5,
                        maxScale: 5,
                        boundaryMargin: const EdgeInsets.all(80),
                        child: CustomPaint(
                          size: const Size(380, 420),
                          painter: FloorPlan2DPainter(widget.result, dx1, dy1, dy2),
                        ),
                      ))
                : GestureDetector(
                    onScaleUpdate: (details) => setState(() {
                      azimuth += details.focalPointDelta.dx * .009;
                      elevation = (elevation - details.focalPointDelta.dy * .0045).clamp(.42, .95);
                      zoom = (zoom * details.scale).clamp(.85, 1.6);
                    }),
                    child: ClipRect(
                      child: Transform.scale(
                        scale: zoom,
                        child: CustomPaint(
                          size: const Size(380, 420),
                          painter: House3DPainter(widget.result, roofVisible, azimuth, elevation, dx1, dy1, dy2),
                        ),
                      ),
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        if (mode == 0) ...[
          Text(editMode
              ? 'Seret garis sekat (titik biru) untuk mengubah ukuran ruangan sesuai keinginan.'
              : 'Pinch untuk zoom • geser untuk melihat seluruh denah • aktifkan mode edit untuk mengubah ukuran ruangan.'),
          if (editMode) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _resetLayout,
                icon: const Icon(Icons.undo),
                label: const Text('Kembalikan denah ke default'),
              ),
            ),
          ],
        ] else ...[
          const Text('Seret jari untuk memutar rumah • cubit dua jari untuk zoom • matikan genteng untuk lihat interior.'),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: _resetView,
              icon: const Icon(Icons.restart_alt),
              label: const Text('Reset tampilan ke posisi normal'),
            ),
          ),
        ],
      ],
    );
  }
}

class FloorPlan2DPainter extends CustomPainter {
  const FloorPlan2DPainter(this.result, this.dx1, this.dy1, this.dy2, {this.editable = false});
  final JsonMap result;
  final double dx1;
  final double dy1;
  final double dy2;
  final bool editable;

  static Rect rectFor(Size size, double l, double w) {
    final scale = math.min((size.width - 70) / l, (size.height - 100) / w);
    final rw = l * scale;
    final rh = w * scale;
    final left = (size.width - rw) / 2;
    const top = 42.0;
    return Rect.fromLTWH(left, top, rw, rh);
  }

  @override
  void paint(Canvas canvas, Size size) {
    final geometry = Map<String, dynamic>.from(result['geometry'] as Map);
    final l = (geometry['length'] as num).toDouble();
    final w = (geometry['width'] as num).toDouble();
    final rect = rectFor(size, l, w);
    final rw = rect.width;
    final rh = rect.height;

    final bg = Paint()..color = const Color(0xFFF8FAFC);
    canvas.drawRect(Offset.zero & size, bg);

    final grid = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = .7;
    final scale = math.min(rw / l, rh / w);
    for (double x = rect.left; x <= rect.right; x += math.max(10, scale)) {
      canvas.drawLine(Offset(x, rect.top), Offset(x, rect.bottom), grid);
    }
    for (double y = rect.top; y <= rect.bottom; y += math.max(10, scale)) {
      canvas.drawLine(Offset(rect.left, y), Offset(rect.right, y), grid);
    }

    // Roof outline (dashed) peeking from behind the walls for a top-view that
    // still reads as a real house rather than a bare box.
    final roofOutline = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final ov = math.min(rw, rh) * .06;
    canvas.drawRect(rect.inflate(ov), roofOutline);
    final ridge = Paint()
      ..color = const Color(0xFFCBD5E1)
      ..strokeWidth = 1.4;
    canvas.drawLine(Offset(rect.left - ov, rect.top + rh / 2), Offset(rect.right + ov, rect.top + rh / 2), ridge);

    final wall = Paint()
      ..color = const Color(0xFF111827)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 7;
    canvas.drawRect(rect, wall);

    final inner = Paint()
      ..color = const Color(0xFF475569)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4;

    // Room dividers — user-editable fractions of the building rectangle.
    final x1 = rect.left + rect.width * dx1;
    final y1 = rect.top + rect.height * dy1;
    final y2 = rect.top + rect.height * dy2;
    canvas.drawLine(Offset(x1, rect.top), Offset(x1, y2), inner);
    canvas.drawLine(Offset(rect.left, y1), Offset(rect.right, y1), inner);
    canvas.drawLine(Offset(rect.left, y2), Offset(x1, y2), inner);
    canvas.drawLine(Offset(x1, y2), Offset(x1, rect.bottom), inner);

    if (editable) {
      final handle = Paint()..color = const Color(0xFF2563EB);
      final handleRing = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2;
      for (final hp in [
        Offset(x1, rect.top + (y2 - rect.top) / 2),
        Offset(rect.left + rect.width * .25, y1),
        Offset(rect.right - rect.width * .25, y1),
        Offset(rect.left + (x1 - rect.left) / 2, y2),
      ]) {
        canvas.drawCircle(hp, 9, handle);
        canvas.drawCircle(hp, 9, handleRing);
      }
    }

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

    // Front entrance door + small porch, drawn on the south (bottom) wall.
    final porch = Paint()..color = const Color(0xFFE2E8F0);
    final porchRect = Rect.fromLTWH(rect.left + rw * .28, rect.bottom, rw * .24, math.min(34, rh * .10));
    canvas.drawRect(porchRect, porch);
    canvas.drawRect(porchRect, roofOutline);

    // Windows.
    final win = Paint()
      ..color = const Color(0xFF0EA5E9)
      ..strokeWidth = 5;
    canvas.drawLine(Offset(rect.left + rw * .20, rect.top), Offset(rect.left + rw * .32, rect.top), win);
    canvas.drawLine(Offset(rect.right - rw * .32, rect.bottom), Offset(rect.right - rw * .18, rect.bottom), win);
    canvas.drawLine(Offset(rect.right, rect.top + rh * .52), Offset(rect.right, rect.top + rh * .64), win);

    _label(canvas, 'DAPUR', Offset(rect.left + rect.width * dx1 * .5, rect.top + rect.height * dy1 * .5), 14);
    _label(canvas, 'KM / WC', Offset(x1 + (rect.right - x1) * .5, rect.top + rect.height * dy1 * .5), 12);
    _label(canvas, 'KAMAR 02', Offset(rect.left + rect.width * dx1 * .5, y1 + (y2 - y1) * .35), 13);
    _label(canvas, 'RUANG KELUARGA', Offset(x1 + (rect.right - x1) * .5, y1 + (rect.bottom - y1) * .32), 12);
    _label(canvas, 'RUANG TAMU', Offset(rect.left + rect.width * dx1 * .5, y2 + (rect.bottom - y2) * .5), 13);
    _label(canvas, 'KAMAR 01', Offset(x1 + (rect.right - x1) * .5, y2 + (rect.bottom - y2) * .58), 13);
    _label(canvas, 'TERAS', Offset(porchRect.center.dx, porchRect.center.dy), 10);

    _dimension(canvas, Offset(rect.left, rect.bottom + 24), Offset(rect.right, rect.bottom + 24), '${l.toStringAsFixed(2)} m');
    _dimension(canvas, Offset(rect.right + 22, rect.top), Offset(rect.right + 22, rect.bottom), '${w.toStringAsFixed(2)} m');
    _label(canvas, 'UTARA ↑', Offset(size.width / 2, 18), 11);
  }

  void _label(Canvas canvas, String text, Offset center, double size) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: const Color(0xFF0F172A), fontSize: size, fontWeight: FontWeight.w700)),
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
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
  bool shouldRepaint(covariant FloorPlan2DPainter oldDelegate) =>
      oldDelegate.result != result ||
      oldDelegate.dx1 != dx1 ||
      oldDelegate.dy1 != dy1 ||
      oldDelegate.dy2 != dy2 ||
      oldDelegate.editable != editable;
}

class House3DPainter extends CustomPainter {
  const House3DPainter(this.result, this.roofVisible, this.azimuth, this.elevation, this.dx1, this.dy1, this.dy2);
  final JsonMap result;
  final bool roofVisible;
  final double azimuth;
  final double elevation;
  final double dx1;
  final double dy1;
  final double dy2;

  @override
  void paint(Canvas canvas, Size size) {
    final g = Map<String, dynamic>.from(result['geometry'] as Map);
    final l = (g['length'] as num).toDouble();
    final w = (g['width'] as num).toDouble();
    final scale = math.min((size.width - 100) / (l + w), (size.height - 140) / (l + w));
    final ox = size.width / 2;
    final oy = size.height * .46;
    final sx = scale;
    final sy = scale * (.22 + elevation * .34);
    final floors = ((g['floors'] as num?) ?? 1).toDouble().clamp(1, 4);
    final wallH = 2.9 * floors; // real wall height in metres, not pixels
    final ov = math.min(l, w) * .10; // eave overhang, in building units

    final cosA = math.cos(azimuth), sinA = math.sin(azimuth);
    final cx = l / 2, cy = w / 2;
    Offset iso(double x, double y, double z) {
      final dx = x - cx, dy = y - cy;
      final rx = dx * cosA - dy * sinA;
      final ry = dx * sinA + dy * cosA;
      return Offset(ox + (rx - ry) * sx, oy + (rx + ry) * sy - z * scale * .62);
    }
    Offset isoLabel(double x, double y, double z) {
      final p = iso(x, y, z);
      return Offset(p.dx.clamp(28.0, size.width - 28.0), p.dy.clamp(16.0, size.height - 16.0));
    }

    final ground = Paint()..color = const Color(0xFFDCEAD9);
    final floorP = Paint()..color = const Color(0xFFF1F5F9);
    final wall = Paint()..color = const Color(0xFFEDEFF2);
    final wallShade = Paint()..color = const Color(0xFFCBD5E1);
    final roofP = Paint()..color = const Color(0xFF7C6355);
    final roofShade = Paint()..color = const Color(0xFF5F4B40);
    final terraceP = Paint()..color = const Color(0xFFD9A066);
    final terraceEdge = Paint()..color = const Color(0xFFB07A3E);
    final railPaint = Paint()
      ..color = const Color(0xFF334155)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;
    final glass = Paint()..color = const Color(0xFF7FB4D8);
    final doorP = Paint()..color = const Color(0xFF6B4A32);
    final partitionP = Paint()..color = const Color(0xFFE7E9EC);
    final outline = Paint()
      ..color = const Color(0xFF334155)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;

    void poly(List<Offset> pts, Paint fill, {bool stroke = true}) {
      final path = Path()..addPolygon(pts, true);
      canvas.drawPath(path, fill);
      if (stroke) canvas.drawPath(path, outline);
    }

    final p00 = iso(0, 0, 0), p10 = iso(l, 0, 0), p11 = iso(l, w, 0), p01 = iso(0, w, 0);
    final t00 = iso(0, 0, wallH), t10 = iso(l, 0, wallH), t11 = iso(l, w, wallH), t01 = iso(0, w, wallH);

    // Ground plane.
    final gpad = math.max(l, w) * .6;
    poly([iso(-gpad, -gpad, 0), iso(l + gpad, -gpad, 0), iso(l + gpad, w + gpad, 0), iso(-gpad, w + gpad, 0)], ground, stroke: false);

    // Room zones (same layout as the 2D denah) tinted onto the floor so the
    // cutaway view reads as real rooms, not an empty box.
    final rx1 = l * dx1, ry1 = w * dy1, ry2 = w * dy2;
    final zoneColors = <List<double>, Color>{
      [0, 0, rx1, ry1]: const Color(0xFFFDE8D2), // DAPUR
      [rx1, 0, l, ry1]: const Color(0xFFD7ECF5), // KM/WC
      [0, ry1, rx1, ry2]: const Color(0xFFE3E0F5), // KAMAR 02
      [rx1, ry1, l, w]: const Color(0xFFE1F0E3), // RUANG KELUARGA (+ KAMAR 01)
      [0, ry2, rx1, w]: const Color(0xFFF5E9DA), // RUANG TAMU
    };
    if (!roofVisible) {
      zoneColors.forEach((box, color) {
        poly(
          [iso(box[0], box[1], .01), iso(box[2], box[1], .01), iso(box[2], box[3], .01), iso(box[0], box[3], .01)],
          Paint()..color = color,
          stroke: false,
        );
      });
    } else {
      poly([p00, p10, p11, p01], floorP, stroke: false);
    }

    // Exterior walls (back/side drawn before front for basic depth ordering).
    poly([p10, p11, t11, t10], wallShade);
    poly([p01, p11, t11, t01], wallShade);
    poly([p00, p10, t10, t00], wall); // south / front facade (has door + windows)
    poly([p00, p01, t01, t00], wall);

    // Door + two windows on the front facade.
    Offset onFront(double u, double v) => Offset(
          t00.dx + (t10.dx - t00.dx) * u + (p00.dx - t00.dx) * v,
          t00.dy + (t10.dy - t00.dy) * u + (p00.dy - t00.dy) * v,
        );
    poly([onFront(.42, .05), onFront(.56, .05), onFront(.56, .82), onFront(.42, .82)], doorP);
    poly([onFront(.14, .28), onFront(.28, .28), onFront(.28, .62), onFront(.14, .62)], glass);
    poly([onFront(.70, .28), onFront(.84, .28), onFront(.84, .62), onFront(.70, .62)], glass);

    // Interior partition walls, visible once the roof is hidden.
    if (!roofVisible) {
      final partH = wallH * .55;
      void wallSeg(double x0, double y0, double x1, double y1) {
        poly([iso(x0, y0, 0), iso(x1, y1, 0), iso(x1, y1, partH), iso(x0, y0, partH)], partitionP);
      }
      wallSeg(rx1, 0, rx1, ry2);
      wallSeg(0, ry1, l, ry1);
      wallSeg(0, ry2, rx1, ry2);
      wallSeg(rx1, ry2, rx1, w);
      _label(canvas, 'DAPUR', isoLabel(rx1 * .5, ry1 * .5, .02), 9);
      _label(canvas, 'KM/WC', isoLabel((rx1 + l) * .5, ry1 * .5, .02), 8);
      _label(canvas, 'KAMAR 02', isoLabel(rx1 * .5, (ry1 + ry2) * .5, .02), 9);
      _label(canvas, 'R. KELUARGA', isoLabel((rx1 + l) * .5, ry1 + (ry2 - ry1) * .5, .02), 8);
      _label(canvas, 'KAMAR 01', isoLabel((rx1 + l) * .5, ry2 + (w - ry2) * .5, .02), 8);
      _label(canvas, 'RUANG TAMU', isoLabel(rx1 * .5, (ry2 + w) * .5, .02), 9);
    }

    // Terrace / porch slab hugging the south (y = 0) facade, drawn last so it
    // always reads clearly in front of the house, with a step and railing.
    final td = math.max(1.3, l * .22);
    final tw = l * .55;
    final stepH = wallH * .12;
    final terr0 = iso(cx - tw / 2, -td, stepH);
    final terr1 = iso(cx + tw / 2, -td, stepH);
    final terr2 = iso(cx + tw / 2, 0, stepH);
    final terr3 = iso(cx - tw / 2, 0, stepH);
    poly([terr0, terr1, terr2, terr3], terraceP);
    poly([terr0, terr1, iso(cx + tw / 2, -td, 0), iso(cx - tw / 2, -td, 0)], terraceEdge);
    poly([terr1, terr2, iso(cx + tw / 2, 0, 0), iso(cx + tw / 2, -td, 0)], terraceEdge);
    for (final fx in [cx - tw / 2, cx - tw / 6, cx + tw / 6, cx + tw / 2]) {
      canvas.drawLine(iso(fx, -td, stepH), iso(fx, -td, stepH + wallH * .38), railPaint);
    }
    canvas.drawLine(iso(cx - tw / 2, -td, stepH + wallH * .38), iso(cx + tw / 2, -td, stepH + wallH * .38), railPaint);

    if (roofVisible) {
      final ridgeZ = wallH + math.max(1.0, math.min(2.6, math.min(l, w) * .38));
      final e00 = iso(-ov, -ov, wallH), e10 = iso(l + ov, -ov, wallH);
      final e11 = iso(l + ov, w + ov, wallH), e01 = iso(-ov, w + ov, wallH);
      final r0 = iso(l / 2, -ov, ridgeZ), r1 = iso(l / 2, w + ov, ridgeZ);
      poly([e00, e10, r0], roofP);
      poly([e01, e11, r1], roofShade);
      poly([e00, e01, r1, r0], roofShade);
      poly([e10, e11, r1, r0], roofP);
    } else {
      final edge = Paint()..color = const Color(0xFF64748B)..style = PaintingStyle.stroke..strokeWidth = 2;
      canvas.drawPath(Path()..addPolygon([t00, t10, t11, t01], true), edge);
      _label(canvas, 'INTERIOR / ATAP DIBUKA', Offset(size.width / 2, size.height - 20), 11);
    }

    _label(canvas, roofVisible ? 'MAKET 3D' : 'MAKET 3D • CUTAWAY ATAS', Offset(size.width / 2, 20), 15);
  }

  void _label(Canvas canvas, String text, Offset center, double size) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: TextStyle(color: const Color(0xFF0F172A), fontSize: size, fontWeight: FontWeight.w700)),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, center - Offset(tp.width / 2, tp.height / 2));
  }

  @override
  bool shouldRepaint(covariant House3DPainter oldDelegate) =>
      oldDelegate.roofVisible != roofVisible ||
      oldDelegate.result != result ||
      oldDelegate.azimuth != azimuth ||
      oldDelegate.elevation != elevation;
}

double _max(double a, double b) => a > b ? a : b;'''

new_s, n = re.subn(pattern, replacement, s, flags=re.S)
if n != 1:
    raise SystemExit(f'expected exactly one maket block, found {n}')
p.write_text(new_s, encoding='utf-8')
print('Maket 2D + 3D upgrade applied (rotatable, with terrace + roof eave + door/windows)')
