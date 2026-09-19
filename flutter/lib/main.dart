import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'rab_engine.dart';
import 'maket_3d.dart';

typedef JsonMap = Map<String, dynamic>;

String money(num value) =>
    'Rp ${NumberFormat('#,##0', 'id_ID').format(value.round())}';

void main() => runApp(const RabRumahApp());

class RabApp extends RabRumahApp {
  const RabApp({super.key});
}

class RabRumahApp extends StatefulWidget {
  const RabRumahApp({super.key});

  @override
  State<RabRumahApp> createState() => _AppState();
}

class _AppState extends State<RabRumahApp> {
  int page = 0;
  JsonMap profile = {
    'name': 'RAB Rumahku',
    'logo': '',
    'address': '',
    'contact': '',
    'license': 'TRIAL',
  };
  List<JsonMap> projects = [];
  List<JsonMap> materials = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final rawProfile = prefs.getString('profile');
    final rawProjects = prefs.getString('projects');
    final rawMaterials = prefs.getString('materials');
    if (!mounted) return;
    setState(() {
      if (rawProfile != null) {
        profile = Map<String, dynamic>.from(jsonDecode(rawProfile) as Map);
      }
      if (rawProjects != null) {
        projects = (jsonDecode(rawProjects) as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
      if (rawMaterials != null) {
        materials = (jsonDecode(rawMaterials) as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
      }
    });
  }

  Future<void> _save() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('profile', jsonEncode(profile));
    await prefs.setString('projects', jsonEncode(projects));
    await prefs.setString('materials', jsonEncode(materials));
  }

  void nav(int index) => setState(() => page = index);

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      HomePage(profile: profile, projects: projects, onNew: () => nav(1)),
      EditorPage(
        onSave: (project) {
          setState(() => projects = [project, ...projects]);
          _save();
          nav(2);
        },
      ),
      ProjectsPage(
        projects: projects,
        onDelete: (index) {
          setState(() => projects.removeAt(index));
          _save();
        },
        onNew: () => nav(1),
      ),
      MaterialPageX(
        items: materials,
        onChanged: (value) {
          setState(() => materials = value);
          _save();
        },
      ),
      MorePage(onNav: nav),
      ReportPage(projects: projects, profile: profile),
      SettingsPage(
        profile: profile,
        onSave: (value) {
          setState(() => profile = value);
          _save();
        },
      ),
      const CalculatorPage(),
      const ReceiptPage(),
      FullMaketView(
        result: projects.isNotEmpty
            ? projects.first['rab'] as JsonMap?
            : null,
      ),
    ];

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: Text('${profile['name'] ?? 'RAB Rumahku'}'),
          actions: [
            IconButton(
              tooltip: 'Kalkulator',
              onPressed: () => nav(7),
              icon: const Icon(Icons.calculate_outlined),
            ),
            IconButton(
              tooltip: 'Kwitansi',
              onPressed: () => nav(8),
              icon: const Icon(Icons.receipt_long_outlined),
            ),
          ],
        ),
        drawer: AppDrawer(page: page, onNav: nav),
        body: pages[page],
        bottomNavigationBar: NavigationBar(
          selectedIndex: page < 5 ? page : 4,
          onDestinationSelected: nav,
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              label: 'Beranda',
            ),
            NavigationDestination(
              icon: Icon(Icons.add_box_outlined),
              label: 'Buat RAB',
            ),
            NavigationDestination(
              icon: Icon(Icons.folder_outlined),
              label: 'Proyek',
            ),
            NavigationDestination(
              icon: Icon(Icons.inventory_2_outlined),
              label: 'Material',
            ),
            NavigationDestination(
              icon: Icon(Icons.more_horiz),
              label: 'Lainnya',
            ),
          ],
        ),
      ),
    );
  }
}

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key, required this.page, required this.onNav});

  final int page;
  final ValueChanged<int> onNav;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        children: [
          const DrawerHeader(
            child: Center(
              child: Text(
                'RAB RUMAHKU',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
          ),
          _item(context, 0, 'Beranda', Icons.home),
          _item(context, 1, 'Buat RAB', Icons.add_box),
          _item(context, 2, 'Proyek Saya', Icons.folder),
          _item(context, 3, 'Material', Icons.inventory_2),
          _item(context, 9, 'Galeri / Maket', Icons.view_in_ar),
          _item(context, 5, 'Laporan', Icons.assessment),
          _item(context, 6, 'Pengaturan & Lisensi', Icons.settings),
          _item(context, 7, 'Kalkulator', Icons.calculate),
          _item(context, 8, 'Kwitansi', Icons.receipt_long),
          const Padding(
            padding: EdgeInsets.all(16),
            child: Text('Offline-first • SPK mobile'),
          ),
        ],
      ),
    );
  }

  Widget _item(BuildContext context, int index, String title, IconData icon) {
    return ListTile(
      selected: page == index,
      leading: Icon(icon),
      title: Text(title),
      onTap: () {
        Navigator.pop(context);
        onNav(index);
      },
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({
    super.key,
    required this.profile,
    required this.projects,
    required this.onNew,
  });

  final JsonMap profile;
  final List<JsonMap> projects;
  final VoidCallback onNew;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'PERENCANAAN RUMAH',
                  style: Theme.of(context).textTheme.labelLarge,
                ),
                Text(
                  'Denah → Material → RAB → Maket',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 10),
                const Text('Data proyek disimpan lokal di perangkat.'),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: onNew,
                  icon: const Icon(Icons.add),
                  label: const Text('BUAT RAB BARU'),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: StatCard(
                label: 'Proyek',
                value: '${projects.length}',
                icon: Icons.folder,
              ),
            ),
            Expanded(
              child: StatCard(
                label: 'RAB',
                value: '${projects.length}',
                icon: Icons.receipt_long,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text('Identitas', style: Theme.of(context).textTheme.titleLarge),
        ListTile(
          leading: const Icon(Icons.business),
          title: Text('${profile['name'] ?? '-'}'),
          subtitle: Text(
            '${profile['address'] ?? ''}\n${profile['contact'] ?? ''}',
          ),
        ),
        const Divider(),
        Text('Proyek terbaru', style: Theme.of(context).textTheme.titleLarge),
        if (projects.isEmpty)
          const ListTile(title: Text('Belum ada proyek'))
        else
          ...projects.take(5).map(
                (project) => Card(
                  child: ListTile(
                    title: Text('${project['name'] ?? '-'}'),
                    subtitle: Text(
                      '${project['length'] ?? 0} × ${project['width'] ?? 0} m',
                    ),
                    trailing: Text(
                      money((project['total'] as num?) ?? 0),
                    ),
                  ),
                ),
              ),
      ],
    );
  }
}

class StatCard extends StatelessWidget {
  const StatCard({super.key, required this.label, required this.value, required this.icon});

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
            Text(label),
          ],
        ),
      ),
    );
  }
}

class EditorPage extends StatefulWidget {
  const EditorPage({super.key, required this.onSave});

  final ValueChanged<JsonMap> onSave;

  @override
  State<EditorPage> createState() => _EditorState();
}

class _EditorState extends State<EditorPage> {
  final name = TextEditingController(text: 'Rumah Baru');
  final owner = TextEditingController();
  final location = TextEditingController();
  double length = 6;
  double width = 6;
  double height = 3;
  double overhang = .5;
  int floors = 1;
  int doors = 4;
  int windows = 5;
  int bathrooms = 1;
  int tab = 0;
  bool topView = true;
  String wall = 'lightbrick';
  String floor = 'tile';
  String roof = 'genteng';
  String ceiling = 'gypsum';

  @override
  void dispose() {
    name.dispose();
    owner.dispose();
    location.dispose();
    super.dispose();
  }

  JsonMap input() {
    return {
      'building': {
        'length': length,
        'width': width,
        'wallHeight': height,
        'floors': floors,
        'overhang': overhang,
        'roofPitch': 30,
        'bathrooms': bathrooms,
        'openings': {'doors': doors, 'windows': windows},
      },
      'spec': {
        'wall': wall,
        'floor': floor,
        'roofCover': roof,
        'ceiling': ceiling,
      },
    };
  }

  void saveProject() {
    final result = RabEngine.calculate(input());
    widget.onSave({
      'name': name.text.trim().isEmpty ? 'Rumah Baru' : name.text.trim(),
      'owner': owner.text,
      'location': location.text,
      'length': length,
      'width': width,
      'floors': floors,
      'area': result['geometry']['floorArea'],
      'total': result['summary']['total'],
      'rab': result,
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  Widget numBox(String label, double value, ValueChanged<double> setter) {
    return TextFormField(
      initialValue: value.toString(),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      onChanged: (text) => setter(double.tryParse(text) ?? value),
    );
  }

  Widget selectBox(
    String label,
    String value,
    List<String> values,
    ValueChanged<String> setter,
  ) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: DropdownButtonFormField<String>(
        value: value,
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        items: values
            .map((item) => DropdownMenuItem(value: item, child: Text(item)))
            .toList(),
        onChanged: (item) {
          if (item != null) setter(item);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final result = RabEngine.calculate(input());
    final summary = Map<String, dynamic>.from(result['summary'] as Map);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Buat RAB', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        Wrap(
          spacing: 6,
          children: ['Data', 'Dimensi', 'Spesifikasi', 'RAB', 'Maket']
              .asMap()
              .entries
              .map(
                (entry) => ChoiceChip(
                  label: Text('${entry.key + 1}. ${entry.value}'),
                  selected: tab == entry.key,
                  onSelected: (_) => setState(() => tab = entry.key),
                ),
              )
              .toList(),
        ),
        const SizedBox(height: 16),
        if (tab == 0) ...[
          TextField(
            controller: name,
            decoration: const InputDecoration(
              labelText: 'Nama proyek',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: owner,
            decoration: const InputDecoration(
              labelText: 'Pemilik',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: location,
            decoration: const InputDecoration(
              labelText: 'Lokasi',
              border: OutlineInputBorder(),
            ),
          ),
        ] else if (tab == 1) ...[
          Row(
            children: [
              Expanded(child: numBox('Panjang (m)', length, (v) => setState(() => length = v))),
              const SizedBox(width: 8),
              Expanded(child: numBox('Lebar (m)', width, (v) => setState(() => width = v))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: numBox('Tinggi dinding', height, (v) => setState(() => height = v))),
              const SizedBox(width: 8),
              Expanded(child: numBox('Overhang', overhang, (v) => setState(() => overhang = v))),
            ],
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<int>(
            value: floors,
            decoration: const InputDecoration(
              labelText: 'Lantai',
              border: OutlineInputBorder(),
            ),
            items: [1, 2, 3]
                .map((v) => DropdownMenuItem(value: v, child: Text('$v lantai')))
                .toList(),
            onChanged: (v) => setState(() => floors = v ?? 1),
          ),
          const SizedBox(height: 10),
          Card(
            child: ListTile(
              title: const Text('Luas bangunan'),
              trailing: Text('${(result['geometry']['floorArea'] as num).toStringAsFixed(2)} m²'),
            ),
          ),
        ] else if (tab == 2) ...[
          selectBox('Dinding', wall, ['lightbrick', 'brick', 'batako'], (v) => setState(() => wall = v)),
          selectBox('Lantai', floor, ['tile', 'granite'], (v) => setState(() => floor = v)),
          selectBox('Atap', roof, ['genteng', 'metal'], (v) => setState(() => roof = v)),
          selectBox('Plafon', ceiling, ['gypsum', 'grc'], (v) => setState(() => ceiling = v)),
          Row(
            children: [
              Expanded(child: numBox('Pintu', doors.toDouble(), (v) => setState(() => doors = v.round()))),
              const SizedBox(width: 8),
              Expanded(child: numBox('Jendela', windows.toDouble(), (v) => setState(() => windows = v.round()))),
            ],
          ),
        ] else if (tab == 3) ...[
          SummaryTable(summary: summary),
          Text('Komponen RAB: ${(result['items'] as List).length} item'),
        ] else ...[
          MaketView(
            result: result,
            topView: topView,
            onTop: () => setState(() => topView = !topView),
          ),
        ],
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            if (tab > 0)
              OutlinedButton(
                onPressed: () => setState(() => tab--),
                child: const Text('Kembali'),
              )
            else
              const SizedBox(),
            FilledButton(
              onPressed: () {
                if (tab < 4) {
                  setState(() => tab++);
                } else {
                  saveProject();
                }
              },
              child: Text(tab == 4 ? 'Simpan Proyek' : 'Lanjut'),
            ),
          ],
        ),
      ],
    );
  }
}

class SummaryTable extends StatelessWidget {
  const SummaryTable({super.key, required this.summary});

  final JsonMap summary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: summary.entries
          .where((entry) => entry.value is num)
          .map(
            (entry) => ListTile(
              title: Text(entry.key),
              trailing: Text(money(entry.value as num)),
            ),
          )
          .toList(),
    );
  }
}

class MaketView extends StatelessWidget {
  const MaketView({
    super.key,
    required this.result,
    required this.topView,
    required this.onTop,
  });

  final JsonMap result;
  final bool topView;
  final VoidCallback onTop;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Maket / Denah', style: Theme.of(context).textTheme.titleLarge),
            Row(
              children: [
                const Text('Tampak atas'),
                Switch(value: topView, onChanged: (_) => onTop()),
              ],
            ),
          ],
        ),
        const SizedBox(height: 8),
        InteractiveViewer(
          minScale: .5,
          maxScale: 4,
          child: CustomPaint(
            size: const Size(340, 340),
            painter: HousePainter(result, topView),
          ),
        ),
        const SizedBox(height: 8),
        const Text('Gunakan pinch/drag untuk memperbesar dan menggeser tampilan.'),
      ],
    );
  }
}

class HousePainter extends CustomPainter {
  const HousePainter(this.result, this.top);

  final JsonMap result;
  final bool top;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;
    final geometry = Map<String, dynamic>.from(result['geometry'] as Map);
    final width = (geometry['width'] as num).toDouble();
    final length = (geometry['length'] as num).toDouble();
    final scale = .72 * size.width / _max(length, width);
    final rect = Rect.fromLTWH(
      (size.width - length * scale) / 2,
      (size.height - width * scale) / 2,
      length * scale,
      width * scale,
    );
    canvas.drawRect(rect, paint);
    if (top) {
      final x = rect.left + rect.width * .45;
      final y = rect.top + rect.height * .55;
      canvas.drawLine(Offset(x, rect.top), Offset(x, rect.bottom), paint);
      canvas.drawLine(Offset(rect.left, y), Offset(rect.right, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant HousePainter oldDelegate) => oldDelegate.top != top;
}

double _max(double a, double b) => a > b ? a : b;

class ProjectsPage extends StatelessWidget {
  const ProjectsPage({
    super.key,
    required this.projects,
    required this.onDelete,
    required this.onNew,
  });

  final List<JsonMap> projects;
  final void Function(int) onDelete;
  final VoidCallback onNew;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Proyek Saya', style: Theme.of(context).textTheme.headlineSmall),
            FilledButton.icon(
              onPressed: onNew,
              icon: const Icon(Icons.add),
              label: const Text('Baru'),
            ),
          ],
        ),
        if (projects.isEmpty)
          const ListTile(title: Text('Belum ada proyek'))
        else
          ...projects.asMap().entries.map(
                (entry) => Card(
                  child: ListTile(
                    title: Text('${entry.value['name'] ?? '-'}'),
                    subtitle: Text(
                      '${entry.value['area'] ?? 0} m² • ${money((entry.value['total'] as num?) ?? 0)}',
                    ),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline),
                      onPressed: () => onDelete(entry.key),
                    ),
                  ),
                ),
              ),
      ],
    );
  }
}

class MaterialPageX extends StatefulWidget {
  const MaterialPageX({super.key, required this.items, required this.onChanged});

  final List<JsonMap> items;
  final ValueChanged<List<JsonMap>> onChanged;

  @override
  State<MaterialPageX> createState() => _MaterialState();
}

class _MaterialState extends State<MaterialPageX> {
  late List<JsonMap> items;

  @override
  void initState() {
    super.initState();
    items = List<JsonMap>.from(widget.items);
  }

  void add() {
    final name = TextEditingController();
    final price = TextEditingController();
    showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Tambah material'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nama')),
            TextField(
              controller: price,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Harga'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () {
              setState(() {
                items.add({
                  'name': name.text.trim(),
                  'unit': 'unit',
                  'price': double.tryParse(price.text) ?? 0,
                });
              });
              widget.onChanged(items);
              Navigator.pop(dialogContext);
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Material', style: Theme.of(context).textTheme.headlineSmall),
            FilledButton.icon(
              onPressed: add,
              icon: const Icon(Icons.add),
              label: const Text('Tambah'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (items.isEmpty)
          const ListTile(title: Text('Belum ada material tambahan.'))
        else
          ...items.map(
                (item) => Card(
                  child: ListTile(
                    title: Text('${item['name'] ?? '-'}'),
                    subtitle: Text('${item['unit'] ?? 'unit'}'),
                    trailing: Text(money((item['price'] as num?) ?? 0)),
                  ),
                ),
              ),
      ],
    );
  }
}

class MorePage extends StatelessWidget {
  const MorePage({super.key, required this.onNav});

  final ValueChanged<int> onNav;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Galeri / Maket', Icons.view_in_ar, 9),
      ('Laporan', Icons.assessment, 5),
      ('Pengaturan & Lisensi', Icons.settings, 6),
      ('Kalkulator', Icons.calculate, 7),
      ('Kwitansi', Icons.receipt_long, 8),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Fitur Lainnya', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        ...items.map(
              (item) => Card(
                child: ListTile(
                  leading: Icon(item.$2),
                  title: Text(item.$1),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => onNav(item.$3),
                ),
              ),
            ),
      ],
    );
  }
}

class ReportPage extends StatelessWidget {
  const ReportPage({super.key, required this.projects, required this.profile});

  final List<JsonMap> projects;
  final JsonMap profile;

  @override
  Widget build(BuildContext context) {
    final total = projects.fold<double>(
      0,
      (sum, project) => sum + ((project['total'] as num?)?.toDouble() ?? 0),
    );
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Laporan', style: Theme.of(context).textTheme.headlineSmall),
        ListTile(title: const Text('Perusahaan'), subtitle: Text('${profile['name'] ?? '-'}')),
        ListTile(title: const Text('Jumlah proyek'), trailing: Text('${projects.length}')),
        ListTile(title: const Text('Total nilai RAB'), trailing: Text(money(total))),
        const Divider(),
        ...projects.map(
              (project) => Card(
                child: ListTile(
                  title: Text('${project['name'] ?? '-'}'),
                  subtitle: Text('${project['owner'] ?? ''} • ${project['location'] ?? ''}'),
                  trailing: Text(money((project['total'] as num?) ?? 0)),
                ),
              ),
            ),
      ],
    );
  }
}

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key, required this.profile, required this.onSave});

  final JsonMap profile;
  final ValueChanged<JsonMap> onSave;

  @override
  State<SettingsPage> createState() => _SettingsState();
}

class _SettingsState extends State<SettingsPage> {
  late final TextEditingController name;
  late final TextEditingController logo;
  late final TextEditingController address;
  late final TextEditingController contact;

  @override
  void initState() {
    super.initState();
    name = TextEditingController(text: '${widget.profile['name'] ?? ''}');
    logo = TextEditingController(text: '${widget.profile['logo'] ?? ''}');
    address = TextEditingController(text: '${widget.profile['address'] ?? ''}');
    contact = TextEditingController(text: '${widget.profile['contact'] ?? ''}');
  }

  @override
  void dispose() {
    name.dispose();
    logo.dispose();
    address.dispose();
    contact.dispose();
    super.dispose();
  }

  void save() {
    widget.onSave({
      ...widget.profile,
      'name': name.text.trim().isEmpty ? 'RAB Rumahku' : name.text.trim(),
      'logo': logo.text.trim(),
      'address': address.text.trim(),
      'contact': contact.text.trim(),
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Identitas tersimpan.')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final license = '${widget.profile['license'] ?? 'TRIAL'}';
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Identitas Perusahaan', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 12),
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Nama CV / Perusahaan', border: OutlineInputBorder())),
        const SizedBox(height: 10),
        TextField(controller: logo, decoration: const InputDecoration(labelText: 'Logo (path atau URL)', border: OutlineInputBorder())),
        const SizedBox(height: 10),
        TextField(controller: address, maxLines: 2, decoration: const InputDecoration(labelText: 'Alamat', border: OutlineInputBorder())),
        const SizedBox(height: 10),
        TextField(controller: contact, decoration: const InputDecoration(labelText: 'Kontak / WhatsApp', border: OutlineInputBorder())),
        const SizedBox(height: 12),
        FilledButton.icon(onPressed: save, icon: const Icon(Icons.save), label: const Text('Simpan Identitas')),
        const SizedBox(height: 24),
        Card(
          child: ListTile(
            leading: const Icon(Icons.verified_user),
            title: const Text('Lisensi Aplikasi'),
            subtitle: Text('Status: $license'),
            trailing: const Icon(Icons.lock_outline),
          ),
        ),
        const Text('Sistem lisensi lokal disiapkan sebagai fondasi; aktivasi server/serial dapat ditambahkan tanpa mengubah modul RAB.'),
      ],
    );
  }
}

class CalculatorPage extends StatefulWidget {
  const CalculatorPage({super.key});

  @override
  State<CalculatorPage> createState() => _CalculatorState();
}

class _CalculatorState extends State<CalculatorPage> {
  final a = TextEditingController();
  final b = TextEditingController();
  String op = '+';
  double result = 0;

  void calculate() {
    final x = double.tryParse(a.text) ?? 0;
    final y = double.tryParse(b.text) ?? 0;
    setState(() {
      result = switch (op) {
        '+' => x + y,
        '-' => x - y,
        '×' => x * y,
        '÷' => y == 0 ? 0 : x / y,
        _ => 0,
      };
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Kalkulator', style: Theme.of(context).textTheme.headlineSmall),
        TextField(controller: a, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Angka 1')),
        TextField(controller: b, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Angka 2')),
        DropdownButton<String>(value: op, items: ['+', '-', '×', '÷'].map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(), onChanged: (v) => setState(() => op = v ?? '+')),
        FilledButton(onPressed: calculate, child: const Text('Hitung')),
        const SizedBox(height: 16),
        Card(child: ListTile(title: const Text('Hasil'), trailing: Text(result.toStringAsFixed(2), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)))),
      ],
    );
  }
}

class ReceiptPage extends StatefulWidget {
  const ReceiptPage({super.key});

  @override
  State<ReceiptPage> createState() => _ReceiptState();
}

class _ReceiptState extends State<ReceiptPage> {
  final from = TextEditingController();
  final to = TextEditingController();
  final amount = TextEditingController();
  final note = TextEditingController();

  @override
  void dispose() {
    from.dispose();
    to.dispose();
    amount.dispose();
    note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final value = double.tryParse(amount.text) ?? 0;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Kwitansi', style: Theme.of(context).textTheme.headlineSmall),
        TextField(controller: from, decoration: const InputDecoration(labelText: 'Dari')),
        TextField(controller: to, decoration: const InputDecoration(labelText: 'Diterima dari')),
        TextField(controller: amount, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Jumlah')),
        TextField(controller: note, decoration: const InputDecoration(labelText: 'Untuk pembayaran')),
        const SizedBox(height: 16),
        FilledButton(onPressed: () => setState(() {}), child: const Text('Tampilkan Kwitansi')),
        const Divider(height: 32),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Center(child: Text('KWITANSI', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
                const SizedBox(height: 16),
                Text('Dari: ${from.text}'),
                Text('Diterima dari: ${to.text}'),
                Text('Jumlah: ${money(value)}'),
                Text('Keterangan: ${note.text}'),
                const SizedBox(height: 24),
                const Text('Kwitansi ini merupakan modul independen dari RAB.'),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
