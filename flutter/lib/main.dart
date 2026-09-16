import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

void main() => runApp(const RabApp());

String rp(num n) => 'Rp${NumberFormat('#,##0', 'id_ID').format(n.round())}';

class RabApp extends StatefulWidget {
  const RabApp({super.key});

  @override
  State<RabApp> createState() => _RabAppState();
}

class _RabAppState extends State<RabApp> {
  int nav = 0;
  Map<String, dynamic> project = {
    'schemaVersion': 1,
    'name': 'Rumah Baru',
    'land': {'length': 10.0, 'width': 15.0},
    'building': {'area': 36.0, 'bedrooms': 2, 'bathrooms': 1},
    'rooms': [],
    'extras': {'overhead': 5.0, 'contingency': 5.0},
  };
  double total = 0;

  void calc() {
    final a = (project['building']['area'] as num).toDouble();
    final base = a * 4000000;
    total = base * 1.10;
    setState(() {});
  }

  @override
  Widget build(BuildContext c) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: const Text('🏠 RAB Rumahku'),
          actions: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Center(child: Text(rp(0))),
            ),
          ],
        ),
        body: _body(),
        bottomNavigationBar: NavigationBar(
          selectedIndex: nav,
          onDestinationSelected: (i) => setState(() => nav = i),
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

  Widget _body() {
    if (nav == 0) return _home();
    if (nav == 1) return _wizard();
    if (nav == 2) return const Center(child: Text('Proyek tersimpan lokal'));
    if (nav == 3) return _materials();
    return const Center(child: Text('RAB Rumahku • Offline-first'));
  }

  Widget _home() => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Buat RAB rumah dengan mudah.',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 20),
          FilledButton.icon(
            onPressed: () {
              setState(() => nav = 1);
              calc();
            },
            icon: const Icon(Icons.add),
            label: const Text('BUAT RAB RUMAH'),
          ),
          const SizedBox(height: 20),
          Card(
            child: ListTile(
              title: Text(project['name']),
              subtitle: Text('Tipe ${project['building']['area'].toInt()} m²'),
              trailing: Text(rp(total)),
            ),
          ),
        ],
      );

  Widget _wizard() => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            'Data Lahan',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          TextField(
            decoration: const InputDecoration(labelText: 'Nama proyek'),
            controller: TextEditingController(text: project['name']),
            onChanged: (v) => project['name'] = v,
          ),
          TextField(
            decoration: const InputDecoration(labelText: 'Panjang lahan'),
            keyboardType: TextInputType.number,
            onChanged: (v) =>
                project['land']['length'] = double.tryParse(v) ?? 10,
          ),
          TextField(
            decoration: const InputDecoration(labelText: 'Lebar lahan'),
            keyboardType: TextInputType.number,
            onChanged: (v) =>
                project['land']['width'] = double.tryParse(v) ?? 15,
          ),
          const SizedBox(height: 15),
          Text(
            'Luas lahan ${(project['land']['length'] * project['land']['width']).toStringAsFixed(1)} m²',
          ),
          const SizedBox(height: 15),
          Text(
            'Luas bangunan',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          Slider(
            value: (project['building']['area'] as num)
                .toDouble()
                .clamp(21, 200),
            min: 21,
            max: 200,
            divisions: 179,
            label: '${project['building']['area']}',
            onChanged: (v) {
              project['building']['area'] = v;
              calc();
            },
          ),
          Card(
            child: ListTile(
              title: const Text('Estimasi RAB'),
              trailing: Text(rp(total)),
            ),
          ),
          FilledButton(
            onPressed: calc,
            child: const Text('Hitung Ulang'),
          ),
        ],
      );

  Widget _materials() => ListView(
        padding: const EdgeInsets.all(20),
        children: const [
          Text(
            'Master Material',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          ListTile(
            title: Text('Semen'),
            subtitle: Text('Struktur • zak'),
            trailing: Text('Rp55.000'),
          ),
          ListTile(
            title: Text('Pasir'),
            subtitle: Text('Struktur • m³'),
            trailing: Text('Rp250.000'),
          ),
          ListTile(
            title: Text('Bata ringan'),
            subtitle: Text('Dinding • pcs'),
            trailing: Text('Rp9.000'),
          ),
          ListTile(
            title: Text('Keramik lantai'),
            subtitle: Text('Lantai • m²'),
            trailing: Text('Rp85.000'),
          ),
        ],
      );
}
