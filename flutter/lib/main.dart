import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'rab_engine.dart';

typedef JsonMap = Map<String, dynamic>;
String money(num value) => 'Rp ${NumberFormat('#,##0', 'id_ID').format(value.round())}';

void main() => runApp(const RabRumahApp());
class RabApp extends RabRumahApp { const RabApp({super.key}); }

class RabRumahApp extends StatefulWidget {
  const RabRumahApp({super.key});
  @override State<RabRumahApp> createState() => _AppState();
}
class _AppState extends State<RabRumahApp> {
  int page = 0;
  JsonMap profile = {'name': 'RAB Rumahku', 'logo': '', 'address': '', 'contact': ''};
  List<JsonMap> projects = [];
  List<JsonMap> customMaterials = [];

  @override void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    final s = await SharedPreferences.getInstance();
    final p = s.getString('profile'), r = s.getString('projects'), m = s.getString('materials');
    if (!mounted) return;
    setState(() {
      if (p != null) profile = JsonMap.from(jsonDecode(p) as Map);
      if (r != null) projects = (jsonDecode(r) as List).map((e) => JsonMap.from(e as Map)).toList();
      if (m != null) customMaterials = (jsonDecode(m) as List).map((e) => JsonMap.from(e as Map)).toList();
    });
  }
  Future<void> _save() async {
    final s = await SharedPreferences.getInstance();
    await s.setString('profile', jsonEncode(profile));
    await s.setString('projects', jsonEncode(projects));
    await s.setString('materials', jsonEncode(customMaterials));
  }
  void nav(int index) => setState(() => page = index);

  @override Widget build(BuildContext context) {
    final pages = <Widget>[
      HomePage(profile: profile, projects: projects, onNew: () => nav(1)),
      EditorPage(onSave: (p) { setState(() => projects = [p, ...projects]); _save(); nav(2); }),
      ProjectsPage(projects: projects, onDelete: (i) { setState(() => projects.removeAt(i)); _save(); }, onNew: () => nav(1)),
      MaterialPageX(items: customMaterials, onChanged: (v) { setState(() => customMaterials = v); _save(); }),
      MorePage(onNav: nav), ReportPage(projects: projects, profile: profile),
      SettingsPage(profile: profile, onSave: (v) { setState(() => profile = v); _save(); }),
      const CalculatorPage(), const ReceiptPage(),
    ];
    final selected = page < 5 ? page : 4;
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: Scaffold(
        appBar: AppBar(title: Text('${profile['name'] ?? 'RAB Rumahku'}'), actions: [
          IconButton(icon: const Icon(Icons.calculate_outlined), onPressed: () => nav(7)),
          IconButton(icon: const Icon(Icons.receipt_long_outlined), onPressed: () => nav(8)),
        ]),
        drawer: AppDrawer(page: page, onNav: nav),
        body: pages[page],
        bottomNavigationBar: NavigationBar(selectedIndex: selected, onDestinationSelected: nav, destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Beranda'),
          NavigationDestination(icon: Icon(Icons.add_box_outlined), label: 'Buat RAB'),
          NavigationDestination(icon: Icon(Icons.folder_outlined), label: 'Proyek'),
          NavigationDestination(icon: Icon(Icons.inventory_2_outlined), label: 'Material'),
          NavigationDestination(icon: Icon(Icons.more_horiz), label: 'Lainnya'),
        ]),
      ),
    );
  }
}

class AppDrawer extends StatelessWidget {
  final int page; final ValueChanged<int> onNav;
  const AppDrawer({super.key, required this.page, required this.onNav});
  @override Widget build(BuildContext context) => Drawer(child: ListView(children: [
    const DrawerHeader(child: Center(child: Text('RAB RUMAHKU', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)))),
    ...(const [(0, 'Beranda', Icons.home), (1, 'Buat RAB', Icons.add_box), (2, 'Proyek Saya', Icons.folder), (3, 'Material', Icons.inventory_2), (4, 'Galeri', Icons.image), (5, 'Laporan', Icons.assessment), (6, 'Pengaturan', Icons.settings), (7, 'Kalkulator', Icons.calculate), (8, 'Kwitansi', Icons.receipt_long)]).map((x) => ListTile(selected: page == x.$1, leading: Icon(x.$3), title: Text(x.$2), onTap: () { Navigator.pop(context); onNav(x.$1); })),
    const Padding(padding: EdgeInsets.all(16), child: Text('Offline-first • SPK mobile')),
  ]));
}

class HomePage extends StatelessWidget {
  final JsonMap profile; final List<JsonMap> projects; final VoidCallback onNew;
  const HomePage({super.key, required this.profile, required this.projects, required this.onNew});
  @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [
    Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('PERENCANAAN RUMAH', style: Theme.of(context).textTheme.labelLarge),
      Text('Denah → Material → RAB → Maket', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 10), const Text('Data proyek disimpan lokal di perangkat.'), const SizedBox(height: 16),
      FilledButton.icon(onPressed: onNew, icon: const Icon(Icons.add), label: const Text('BUAT RAB BARU')),
    ]))), const SizedBox(height: 12), Row(children: [
      Expanded(child: StatCard('Proyek', '${projects.length}', Icons.folder)), Expanded(child: StatCard('RAB', '${projects.length}', Icons.receipt_long)),
    ]), const SizedBox(height: 12), Text('Identitas', style: Theme.of(context).textTheme.titleLarge),
    ListTile(leading: const Icon(Icons.business), title: Text('${profile['name'] ?? '-'}'), subtitle: Text('${profile['address'] ?? ''}\n${profile['contact'] ?? ''}')),
    const Divider(), Text('Proyek terbaru', style: Theme.of(context).textTheme.titleLarge),
    if (projects.isEmpty) const ListTile(title: Text('Belum ada proyek')) else ...projects.take(5).map((p) => Card(child: ListTile(title: Text('${p['name'] ?? '-'}'), subtitle: Text('${p['length'] ?? 0} × ${p['width'] ?? 0} m'), trailing: Text(money((p['total'] as num?) ?? 0))))),
  ]);
}
class StatCard extends StatelessWidget { final String label, value; final IconData icon; const StatCard(this.label, this.value, this.icon, {super.key}); @override Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(12), child: Column(children: [Icon(icon), Text(value, style: const TextStyle(fontWeight: FontWeight.bold)), Text(label)]))); }

class EditorPage extends StatefulWidget { final ValueChanged<JsonMap> onSave; const EditorPage({super.key, required this.onSave}); @override State<EditorPage> createState() => _EditorState(); }
class _EditorState extends State<EditorPage> {
  final name = TextEditingController(text: 'Rumah Baru'), owner = TextEditingController(), location = TextEditingController();
  double length = 6, width = 6, height = 3, overhang = .5; int floors = 1, doors = 4, windows = 5, bathrooms = 1, tab = 0; bool topView = true;
  String wall = 'lightbrick', floor = 'tile', roof = 'genteng', ceiling = 'gypsum';
  @override void dispose() { name.dispose(); owner.dispose(); location.dispose(); super.dispose(); }
  JsonMap input() => {'building': {'length': length, 'width': width, 'wallHeight': height, 'floors': floors, 'overhang': overhang, 'roofPitch': 30, 'bathrooms': bathrooms, 'openings': {'doors': doors, 'windows': windows}}, 'spec': {'wall': wall, 'floor': floor, 'roofCover': roof, 'ceiling': ceiling}};
  void finish() { final r = RabEngine.calculate(input()); widget.onSave({'name': name.text.trim().isEmpty ? 'Rumah Baru' : name.text.trim(), 'owner': owner.text, 'location': location.text, 'length': length, 'width': width, 'floors': floors, 'area': r['geometry']['floorArea'], 'total': r['summary']['total'], 'rab': r, 'createdAt': DateTime.now().toIso8601String()}); }
  Widget numBox(String label, double value, ValueChanged<double> set) => TextFormField(initialValue: value.toString(), keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()), onChanged: (v) => set(double.tryParse(v) ?? value));
  Widget selectBox(String label, String value, List<String> values, ValueChanged<String> set) => Padding(padding: const EdgeInsets.only(bottom: 10), child: DropdownButtonFormField<String>(initialValue: value, decoration: InputDecoration(labelText: label, border: const OutlineInputBorder()), items: values.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) { if (v != null) set(v); }));
  @override Widget build(BuildContext context) {
    final r = RabEngine.calculate(input()), s = JsonMap.from(r['summary']);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('Buat RAB', style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 12),
      Wrap(spacing: 6, children: ['Data', 'Dimensi', 'Spesifikasi', 'RAB', 'Maket'].asMap().entries.map((e) => ChoiceChip(label: Text('${e.key + 1}. ${e.value}'), selected: tab == e.key, onSelected: (_) => setState(() => tab = e.key))).toList()), const SizedBox(height: 16),
      if (tab == 0) ...[
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Nama proyek', border: OutlineInputBorder())), const SizedBox(height: 10),
        TextField(controller: owner, decoration: const InputDecoration(labelText: 'Pemilik', border: OutlineInputBorder())), const SizedBox(height: 10),
        TextField(controller: location, decoration: const InputDecoration(labelText: 'Lokasi', border: OutlineInputBorder())),
      ] else if (tab == 1) ...[
        Row(children: [Expanded(child: numBox('Panjang (m)', length, (v) => setState(() => length = v))), const SizedBox(width: 8), Expanded(child: numBox('Lebar (m)', width, (v) => setState(() => width = v)))]), const SizedBox(height: 10),
        Row(children: [Expanded(child: numBox('Tinggi dinding', height, (v) => setState(() => height = v))), const SizedBox(width: 8), Expanded(child: numBox('Overhang', overhang, (v) => setState(() => overhang = v)))]), const SizedBox(height: 10),
        DropdownButtonFormField<int>(initialValue: floors, decoration: const InputDecoration(labelText: 'Lantai', border: OutlineInputBorder()), items: [1, 2, 3].map((v) => DropdownMenuItem(value: v, child: Text('$v lantai'))).toList(), onChanged: (v) => setState(() => floors = v ?? 1)), const SizedBox(height: 10),
        Card(child: ListTile(title: const Text('Luas bangunan'), trailing: Text('${(r['geometry']['floorArea'] as num).toStringAsFixed(2)} m²'))),
      ] else if (tab == 2) ...[
        selectBox('Dinding', wall, ['lightbrick', 'brick', 'batako'], (v) => setState(() => wall = v)), selectBox('Lantai', floor, ['tile', 'granite'], (v) => setState(() => floor = v)), selectBox('Atap', roof, ['genteng', 'metal'], (v) => setState(() => roof = v)), selectBox('Plafon', ceiling, ['gypsum', 'grc'], (v) => setState(() => ceiling = v)),
        Row(children: [Expanded(child: numBox('Pintu', doors.toDouble(), (v) => setState(() => doors = v.round()))), const SizedBox(width: 8), Expanded(child: numBox('Jendela', windows.toDouble(), (v) => setState(() => windows = v.round())))]),
      ] else if (tab == 3) ...[
        SummaryTable(summary: s), Text('Komponen RAB: ${(r['items'] as List).length} item'),
      ] else ...[
        MaketView(r: r, topView: topView, onTop: () => setState(() => topView = !topView)),
      ],
      const SizedBox(height: 20), Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        if (tab > 0) OutlinedButton(onPressed: () => setState(() => tab--), child: const Text('Kembali')) else const SizedBox(),
        FilledButton(onPressed: () { if (tab < 4) { setState(() => tab++); } else { finish(); } }, child: Text(tab == 4 ? 'Simpan Proyek' : 'Lanjut')),
      ]),
    ]);
  }
}
class SummaryTable extends StatelessWidget { final JsonMap summary; const SummaryTable({super.key, required this.summary}); @override Widget build(BuildContext context) => Column(children: summary.entries.where((e) => e.value is num).map((e) => ListTile(title: Text(e.key), trailing: Text(money(e.value as num)))).toList()); }
class MaketView extends StatelessWidget { final JsonMap r; final bool topView; final VoidCallback onTop; const MaketView({super.key, required this.r, required this.topView, required this.onTop}); @override Widget build(BuildContext context) => Column(children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Maket / Denah', style: Theme.of(context).textTheme.titleLarge), Row(children: [const Text('Tampak atas'), Switch(value: topView, onChanged: (_) => onTop())])]), InteractiveViewer(minScale: .5, maxScale: 4, child: CustomPaint(size: const Size(340, 340), painter: HousePainter(r, topView))) ]); }
class HousePainter extends CustomPainter { final JsonMap r; final bool top; HousePainter(this.r, this.top); @override void paint(Canvas canvas, Size size) { final p = Paint()..style = PaintingStyle.stroke..strokeWidth = 3; final g = JsonMap.from(r['geometry']); final w = (g['width'] as num).toDouble(), l = (g['length'] as num).toDouble(); final scale = .72 * size.width / mathMax(l, w); final rect = Rect.fromLTWH((size.width - l * scale) / 2, (size.height - w * scale) / 2, l * scale, w * scale); canvas.drawRect(rect, p); if (top) { final x = rect.left + rect.width * .45; canvas.drawLine(Offset(x, rect.top), Offset(x, rect.bottom), p); canvas.drawLine(Offset(rect.left, rect.top + rect.height * .55), Offset(rect.right, rect.top + rect.height * .55), p); } } @override bool shouldRepaint(covariant HousePainter oldDelegate) => oldDelegate.top != top; }
double mathMax(double a, double b) => a > b ? a : b;

class ProjectsPage extends StatelessWidget { final List<JsonMap> projects; final void Function(int) onDelete; final VoidCallback onNew; const ProjectsPage({super.key, required this.projects, required this.onDelete, required this.onNew}); @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Proyek Saya', style: Theme.of(context).textTheme.headlineSmall), FilledButton.icon(onPressed: onNew, icon: const Icon(Icons.add), label: const Text('Baru'))]), if (projects.isEmpty) const ListTile(title: Text('Belum ada proyek')) else ...projects.asMap().entries.map((e) => Card(child: ListTile(title: Text('${e.value['name'] ?? '-'}'), subtitle: Text('${e.value['area'] ?? 0} m² • ${money((e.value['total'] as num?) ?? 0)}'), trailing: IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => onDelete(e.key)))))]); }
class MaterialPageX extends StatefulWidget { final List<JsonMap> items; final ValueChanged<List<JsonMap>> onChanged; const MaterialPageX({super.key, required this.items, required this.onChanged}); @override State<MaterialPageX> createState() => _MaterialState(); }
class _MaterialState extends State<MaterialPageX> { late List<JsonMap> items; @override void initState() { super.initState(); items = List<JsonMap>.from(widget.items); } void add() { final n = TextEditingController(), p = TextEditingController(); showDialog(context: context, builder: (context) => AlertDialog(title: const Text('Tambah material'), content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: n, decoration: const InputDecoration(labelText: 'Nama')), TextField(controller: p, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Harga'))]), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Batal')), FilledButton(onPressed: () { setState(() => items.add({'name': n.text, 'unit': 'unit', 'price': double.tryParse(p.text) ?? 0})); widget.onChanged(items); Navigator.pop(context); }, child: const Text('Simpan'))])); } @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Material', style: Theme.of(context).textTheme.headlineSmall), FilledButton.icon(onPressed: add, icon: const Icon(Icons.add), label: const Text('Tambah'))]), ...RabEngine.materials.entries.map((e) => ListTile(title: Text(e.value[0] as String), subtitle: Text('${e.value[1]} • ${money(e.value[2] as num)}'))), ...items.map((e) => ListTile(title: Text('${e['name'] ?? '-'}'), subtitle: Text(money((e['price'] as num?) ?? 0))))]); }

class MorePage extends StatelessWidget { final ValueChanged<int> onNav; const MorePage({super.key, required this.onNav}); @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [Text('Fitur Lainnya', style: Theme.of(context).textTheme.headlineSmall), ...[(7, 'Kalkulator', Icons.calculate), (8, 'Kwitansi', Icons.receipt_long), (5, 'Laporan', Icons.assessment), (6, 'Pengaturan', Icons.settings), (4, 'Galeri', Icons.image), (6, 'Lisensi', Icons.verified_user)].map((x) => Card(child: ListTile(leading: Icon(x.$3), title: Text(x.$2), trailing: const Icon(Icons.chevron_right), onTap: () => onNav(x.$1))))]); }
class ReportPage extends StatelessWidget { final List<JsonMap> projects; final JsonMap profile; const ReportPage({super.key, required this.projects, required this.profile}); @override Widget build(BuildContext context) { final total = projects.fold<double>(0, (a, p) => a + ((p['total'] as num?)?.toDouble() ?? 0)); return ListView(padding: const EdgeInsets.all(16), children: [Text('Laporan', style: Theme.of(context).textTheme.headlineSmall), Text('${profile['name'] ?? ''}'), ListTile(title: const Text('Jumlah proyek'), trailing: Text('${projects.length}')), ListTile(title: const Text('Total nilai RAB'), trailing: Text(money(total)))]; } }

class SettingsPage extends StatefulWidget { final JsonMap profile; final ValueChanged<JsonMap> onSave; const SettingsPage({super.key, required this.profile, required this.onSave}); @override State<SettingsPage> createState() => _SettingsState(); }
class _SettingsState extends State<SettingsPage> { late final TextEditingController name, logo, address, contact; @override void initState() { super.initState(); name = TextEditingController(text: '${widget.profile['name'] ?? ''}'); logo = TextEditingController(text: '${widget.profile['logo'] ?? ''}'); address = TextEditingController(text: '${widget.profile['address'] ?? ''}'); contact = TextEditingController(text: '${widget.profile['contact'] ?? ''}'); } @override void dispose() { name.dispose(); logo.dispose(); address.dispose(); contact.dispose(); super.dispose(); } @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [Text('Identitas Perusahaan', style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 12), TextField(controller: name, decoration: const InputDecoration(labelText: 'Nama CV / Perusahaan', border: OutlineInputBorder())), const SizedBox(height: 10), TextField(controller: logo, decoration: const InputDecoration(labelText: 'Logo (path / URL)', border: OutlineInputBorder())), const SizedBox(height: 10), TextField(controller: address, maxLines: 2, decoration: const InputDecoration(labelText: 'Alamat', border: OutlineInputBorder())), const SizedBox(height: 10), TextField(controller: contact, decoration: const InputDecoration(labelText: 'Kontak', border: OutlineInputBorder())), const SizedBox(height: 16), FilledButton.icon(onPressed: () { widget.onSave({'name': name.text, 'logo': logo.text, 'address': address.text, 'contact': contact.text}); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Identitas tersimpan'))); }, icon: const Icon(Icons.save), label: const Text('Simpan Identitas')), const SizedBox(height: 24), const Card(child: ListTile(leading: Icon(Icons.verified_user), title: Text('Lisensi'), subtitle: Text('Status lisensi lokal: BELUM DIIMPLEMENTASIKAN')))]); }

class CalculatorPage extends StatefulWidget { const CalculatorPage({super.key}); @override State<CalculatorPage> createState() => _CalculatorState(); }
class _CalculatorState extends State<CalculatorPage> { final a = TextEditingController(), b = TextEditingController(); String op = '+'; @override void dispose() { a.dispose(); b.dispose(); super.dispose(); } @override Widget build(BuildContext context) { final x = double.tryParse(a.text) ?? 0, y = double.tryParse(b.text) ?? 0; final result = op == '+' ? x + y : op == '-' ? x - y : op == '×' ? x * y : y == 0 ? 0 : x / y; return ListView(padding: const EdgeInsets.all(16), children: [Text('Kalkulator', style: Theme.of(context).textTheme.headlineSmall), TextField(controller: a, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Angka 1')), DropdownButtonFormField<String>(initialValue: op, items: const ['+', '-', '×', '÷'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => setState(() => op = v ?? '+')), TextField(controller: b, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Angka 2')), const SizedBox(height: 20), Card(child: ListTile(title: const Text('Hasil'), trailing: Text(result.toString()))), const SizedBox(height: 10), FilledButton(onPressed: () => setState(() {}), child: const Text('Hitung'))]); } }

class ReceiptPage extends StatefulWidget { const ReceiptPage({super.key}); @override State<ReceiptPage> createState() => _ReceiptState(); }
class _ReceiptState extends State<ReceiptPage> { final from = TextEditingController(), to = TextEditingController(), amount = TextEditingController(); @override void dispose() { from.dispose(); to.dispose(); amount.dispose(); super.dispose(); } @override Widget build(BuildContext context) => ListView(padding: const EdgeInsets.all(16), children: [Text('Kwitansi', style: Theme.of(context).textTheme.headlineSmall), TextField(controller: from, decoration: const InputDecoration(labelText: 'Diterima dari')), TextField(controller: to, decoration: const InputDecoration(labelText: 'Untuk pembayaran')), TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Nominal')), const SizedBox(height: 16), Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('KWITANSI', style: Theme.of(context).textTheme.titleLarge), Text('Dari: ${from.text}'), Text('Keperluan: ${to.text}'), Text('Nominal: ${money(double.tryParse(amount.text) ?? 0)}')]))), FilledButton(onPressed: () => setState(() {}), child: const Text('Perbarui'))]); }
