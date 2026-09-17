import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LicenseService {
  static const _key = 'app_license_key';
  static const _activatedAt = 'app_license_activated_at';
  static const _trialStarted = 'app_trial_started';
  static const int trialDays = 7;

  static Future<String?> key() async {
    final p = await SharedPreferences.getInstance();
    return p.getString(_key);
  }

  static Future<bool> isActivated() async {
    final p = await SharedPreferences.getInstance();
    final key = p.getString(_key);
    return key != null && _validKey(key);
  }

  static Future<int> trialDaysLeft() async {
    final p = await SharedPreferences.getInstance();
    var started = p.getInt(_trialStarted);
    if (started == null) {
      started = DateTime.now().millisecondsSinceEpoch;
      await p.setInt(_trialStarted, started);
    }
    final elapsed = DateTime.now().difference(
      DateTime.fromMillisecondsSinceEpoch(started),
    );
    return (trialDays - elapsed.inDays).clamp(0, trialDays);
  }

  static bool _validKey(String value) {
    final normalized = value.trim().toUpperCase();
    final parts = normalized.split('-');
    if (parts.length != 3 || parts[0] != 'RABRUMAH' || parts[1] != 'PRO') {
      return false;
    }
    final code = parts[2];
    if (code.length != 8) return false;
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return code.split('').every(alphabet.contains);
  }

  static Future<bool> activate(String value) async {
    final normalized = value.trim().toUpperCase();
    if (!_validKey(normalized)) return false;
    final p = await SharedPreferences.getInstance();
    await p.setString(_key, normalized);
    await p.setInt(_activatedAt, DateTime.now().millisecondsSinceEpoch);
    return true;
  }

  static Future<void> deactivate() async {
    final p = await SharedPreferences.getInstance();
    await p.remove(_key);
    await p.remove(_activatedAt);
  }
}

class LicensePage extends StatefulWidget {
  const LicensePage({super.key});

  @override
  State<LicensePage> createState() => _LicensePageState();
}

class _LicensePageState extends State<LicensePage> {
  final controller = TextEditingController();
  bool activated = false;
  int trialLeft = 0;
  String? currentKey;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    final a = await LicenseService.isActivated();
    final t = await LicenseService.trialDaysLeft();
    final k = await LicenseService.key();
    if (!mounted) return;
    setState(() {
      activated = a;
      trialLeft = t;
      currentKey = k;
    });
  }

  Future<void> activate() async {
    final ok = await LicenseService.activate(controller.text);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(ok ? 'Lisensi berhasil diaktifkan.' : 'Kode lisensi tidak valid.')),
    );
    if (ok) controller.clear();
    await refresh();
  }

  Future<void> deactivate() async {
    await LicenseService.deactivate();
    await refresh();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Lisensi Aplikasi', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: Icon(activated ? Icons.verified : Icons.hourglass_bottom),
            title: Text(activated ? 'AKTIF' : 'MODE TRIAL'),
            subtitle: Text(activated ? 'Lisensi: $currentKey' : 'Sisa trial: $trialLeft hari'),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: controller,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(
            labelText: 'Kode Lisensi',
            hintText: 'RABRUMAH-PRO-XXXXXXXX',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 10),
        FilledButton.icon(
          onPressed: activate,
          icon: const Icon(Icons.key),
          label: const Text('Aktifkan Lisensi'),
        ),
        if (activated) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: deactivate,
            icon: const Icon(Icons.logout),
            label: const Text('Nonaktifkan di perangkat ini'),
          ),
        ],
        const SizedBox(height: 18),
        const Text('Lisensi disimpan lokal pada perangkat. Untuk distribusi komersial, validasi penerbitan kode sebaiknya dilakukan oleh server lisensi agar kode tidak dapat dibuat sendiri oleh pengguna.'),
      ],
    );
  }
}

class LicenseGate extends StatefulWidget {
  const LicenseGate({super.key, required this.child, required this.onOpenLicense});
  final Widget child;
  final VoidCallback onOpenLicense;

  @override
  State<LicenseGate> createState() => _LicenseGateState();
}

class _LicenseGateState extends State<LicenseGate> {
  bool loading = true;
  bool active = false;
  int trialLeft = 0;

  @override
  void initState() {
    super.initState();
    check();
  }

  Future<void> check() async {
    final a = await LicenseService.isActivated();
    final t = await LicenseService.trialDaysLeft();
    if (!mounted) return;
    setState(() {
      active = a;
      trialLeft = t;
      loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (active || trialLeft > 0) return widget.child;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.lock_outline, size: 56),
            const SizedBox(height: 12),
            const Text('Masa trial telah berakhir.', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Aktifkan lisensi untuk melanjutkan penggunaan aplikasi.'),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: widget.onOpenLicense, icon: const Icon(Icons.key), label: const Text('Buka Lisensi')),
          ],
        ),
      ),
    );
  }
}
