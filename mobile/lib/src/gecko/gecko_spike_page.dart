import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../navigation_input.dart';
import 'gecko_view.dart';

/// Prueba de fuego de la opción A (ver PLAN-GECKOVIEW.md): GeckoView + uBlock Origin
/// adentro de Flutter. Solo se usa en el APK "Patagonia Gecko Prueba".
class GeckoSpikePage extends StatefulWidget {
  const GeckoSpikePage({super.key});

  @override
  State<GeckoSpikePage> createState() => _GeckoSpikePageState();
}

class _SpikeTest {
  const _SpikeTest(this.id, this.title, this.url, this.howTo);

  final String id;
  final String title;
  final String url;
  final String howTo;
}

const _tests = [
  _SpikeTest('scroll', 'Scroll', 'https://es.m.wikipedia.org/wiki/Patagonia',
      'Deslizá rápido para arriba y para abajo. Pellizcá para agrandar. ¿Va fluido, sin tirones?'),
  _SpikeTest('teclado', 'Teclado', 'https://duckduckgo.com',
      'Tocá el cuadro de búsqueda de la página y escribí. Probá también la barra de arriba de Patagonia.'),
  _SpikeTest('youtube', 'YouTube sin anuncios', 'https://m.youtube.com',
      'Mirá 2 o 3 videos enteros. ¿Aparece algún anuncio?'),
  _SpikeTest('pantalla', 'Video en pantalla completa', 'https://m.youtube.com',
      'Poné un video en pantalla completa, girá el celular y salí con el botón Atrás.'),
  _SpikeTest('fondo', 'Audio con pantalla bloqueada', 'https://m.youtube.com',
      'Poné un video y bloqueá la pantalla. ¿Sigue el sonido? (Puede que no: eso se programa después.)'),
  _SpikeTest('bloqueo', 'Página de prueba de bloqueo', 'https://d3ward.github.io/toolz/adblock.html',
      'Muestra un puntaje de cuánto bloquea.'),
];

class _GeckoSpikePageState extends State<GeckoSpikePage> {
  final _address = TextEditingController();
  final _addressFocus = FocusNode();
  final Map<String, bool> _results = {};

  GeckoComposition _composition = GeckoComposition.texture;
  int _generation = 0;
  String _startUrl = 'https://m.youtube.com';
  GeckoController? _controller;
  bool _fullScreen = false;
  bool _desktop = false;
  String _uboStatus = 'Preparando uBlock Origin…';

  @override
  void initState() {
    super.initState();
    GeckoEngineInfo.ensureUBlock().then(
      (version) {
        if (mounted) setState(() => _uboStatus = 'uBlock Origin $version activo');
      },
      onError: (Object error) {
        if (mounted) setState(() => _uboStatus = 'uBlock Origin NO se pudo activar: $error');
      },
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    _address.dispose();
    _addressFocus.dispose();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  void _onCreated(GeckoController controller) {
    _controller?.dispose();
    controller.url.addListener(() {
      if (!_addressFocus.hasFocus) _address.text = controller.url.value;
    });
    controller.fullScreen.addListener(() => _setFullScreen(controller.fullScreen.value));
    setState(() {
      _controller = controller;
      _desktop = false;
    });
  }

  void _setFullScreen(bool full) {
    if (!mounted || full == _fullScreen) return;
    setState(() => _fullScreen = full);
    SystemChrome.setEnabledSystemUIMode(
      full ? SystemUiMode.immersiveSticky : SystemUiMode.edgeToEdge,
    );
  }

  void _open(String value) {
    if (value.trim().isEmpty) return;
    final uri = NavigationInput.resolve(value);
    _addressFocus.unfocus();
    _address.text = uri.toString();
    _controller?.load(uri.toString());
  }

  void _changeComposition(GeckoComposition composition) {
    // Recrea la vista nativa con el otro modo, en la página donde estaba.
    final current = _controller?.url.value ?? '';
    setState(() {
      _composition = composition;
      if (current.startsWith('http')) _startUrl = current;
      _controller?.dispose();
      _controller = null;
      _generation++;
    });
  }

  Future<void> _onBack() async {
    final controller = _controller;
    if (controller == null) return SystemNavigator.pop();
    if (_fullScreen) return controller.exitFullScreen();
    if (controller.canGoBack.value) return controller.back();
    await SystemNavigator.pop();
  }

  void _showTests() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheet) {
          void mark(String id, bool ok) {
            setState(() => _results['${_composition.name}/$id'] = ok);
            setSheet(() {});
          }

          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.8,
            builder: (context, scroll) => ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
              children: [
                Text('Pruebas · modo ${_composition.label}',
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(_uboStatus),
                const SizedBox(height: 12),
                for (final test in _tests)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(test.title, style: Theme.of(context).textTheme.titleMedium),
                          const SizedBox(height: 4),
                          Text(test.howTo),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              FilledButton.tonal(
                                onPressed: () {
                                  Navigator.pop(context);
                                  _open(test.url);
                                },
                                child: const Text('Abrir'),
                              ),
                              ChoiceChip(
                                label: const Text('Anda bien'),
                                selected: _results['${_composition.name}/${test.id}'] == true,
                                onSelected: (_) => mark(test.id, true),
                              ),
                              ChoiceChip(
                                label: const Text('Anda mal'),
                                selected: _results['${_composition.name}/${test.id}'] == false,
                                onSelected: (_) => mark(test.id, false),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    _showSummary();
                  },
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Ver resumen para mandar'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSummary() {
    final lines = <String>[_uboStatus, ''];
    for (final mode in GeckoComposition.values) {
      lines.add('Modo ${mode.label}:');
      for (final test in _tests) {
        final result = _results['${mode.name}/${test.id}'];
        final mark = result == null ? '—' : (result ? 'bien' : 'MAL');
        lines.add('  ${test.title}: $mark');
      }
    }
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Resumen de la prueba'),
        content: SingleChildScrollView(child: SelectableText(lines.join('\n'))),
        actions: [
          TextButton(
            onPressed: () => Clipboard.setData(ClipboardData(text: lines.join('\n'))),
            child: const Text('Copiar'),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cerrar')),
        ],
      ),
    );
  }

  void _showMenu() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            const ListTile(title: Text('Cómo se dibuja la página (prueba)')),
            for (final mode in GeckoComposition.values)
              ListTile(
                leading: Icon(mode == _composition
                    ? Icons.radio_button_checked
                    : Icons.radio_button_unchecked),
                title: Text(mode.label),
                subtitle: Text(mode.description),
                onTap: () {
                  Navigator.pop(context);
                  if (mode != _composition) _changeComposition(mode);
                },
              ),
            const Divider(),
            SwitchListTile(
              secondary: const Icon(Icons.desktop_windows_outlined),
              title: const Text('Modo escritorio'),
              value: _desktop,
              onChanged: (value) {
                Navigator.pop(context);
                setState(() => _desktop = value);
                _controller?.setDesktop(value);
              },
            ),
            ListTile(
              leading: const Icon(Icons.info_outline),
              title: const Text('Créditos y licencias'),
              onTap: () {
                Navigator.pop(context);
                _showCredits();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showCredits() {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Créditos'),
        content: const SingleChildScrollView(
          child: Text(
            'uBlock Origin 1.75.0\n'
            '© Raymond Hill y colaboradores.\n'
            'Licencia GNU GPL versión 3. Se incluye sin modificar, tal como lo publica '
            'su autor (firmado por Mozilla). El texto completo de la licencia viene '
            'dentro de la extensión (LICENSE.txt).\n'
            'Código fuente: https://github.com/gorhill/uBlock/tree/1.75.0\n\n'
            'Motor GeckoView 159\n'
            '© Mozilla y colaboradores. Licencia Mozilla Public License 2.0.\n'
            'Código fuente: https://github.com/mozilla-firefox/firefox\n\n'
            'Las listas de filtros que usa uBlock Origin (EasyList, EasyPrivacy, '
            'listas de uBlock y otras) tienen sus propios autores y licencias.',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cerrar')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _onBack();
      },
      child: Scaffold(
        body: SafeArea(
          top: !_fullScreen,
          bottom: !_fullScreen,
          child: Column(
            children: [
              if (!_fullScreen)
                Padding(
                  padding: const EdgeInsets.fromLTRB(8, 6, 4, 6),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          key: const ValueKey('gecko-address'),
                          controller: _address,
                          focusNode: _addressFocus,
                          keyboardType: TextInputType.url,
                          textInputAction: TextInputAction.go,
                          autocorrect: false,
                          decoration: const InputDecoration(
                            isDense: true,
                            hintText: 'Buscá o escribí una dirección',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.shield_outlined),
                          ),
                          onSubmitted: _open,
                        ),
                      ),
                      IconButton(
                        tooltip: 'Menú',
                        onPressed: _showMenu,
                        icon: const Icon(Icons.more_vert),
                      ),
                    ],
                  ),
                ),
              if (!_fullScreen && controller != null)
                ValueListenableBuilder<int>(
                  valueListenable: controller.progress,
                  builder: (context, progress, _) => progress > 0 && progress < 100
                      ? LinearProgressIndicator(value: progress / 100, minHeight: 2)
                      : const SizedBox(height: 2),
                ),
              Expanded(
                child: Stack(
                  children: [
                    GeckoBrowserView(
                      key: ValueKey('gecko-$_generation'),
                      initialUrl: _startUrl,
                      composition: _composition,
                      onCreated: _onCreated,
                    ),
                    if (controller != null)
                      ValueListenableBuilder<bool>(
                        valueListenable: controller.crashed,
                        builder: (context, crashed, _) => crashed
                            ? Center(
                                child: FilledButton(
                                  onPressed: () => _changeComposition(_composition),
                                  child: const Text('La página se cerró. Tocá para recargar.'),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                  ],
                ),
              ),
              if (!_fullScreen)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _NavButton(
                      icon: Icons.arrow_back,
                      tooltip: 'Atrás',
                      enabled: controller?.canGoBack,
                      onPressed: () => controller?.back(),
                    ),
                    _NavButton(
                      icon: Icons.arrow_forward,
                      tooltip: 'Adelante',
                      enabled: controller?.canGoForward,
                      onPressed: () => controller?.forward(),
                    ),
                    IconButton(
                      tooltip: 'Recargar',
                      onPressed: () => controller?.reload(),
                      icon: const Icon(Icons.refresh),
                    ),
                    TextButton.icon(
                      onPressed: _showTests,
                      icon: const Icon(Icons.checklist),
                      label: const Text('Pruebas'),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({
    required this.icon,
    required this.tooltip,
    required this.enabled,
    required this.onPressed,
  });

  final IconData icon;
  final String tooltip;
  final ValueNotifier<bool>? enabled;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final notifier = enabled;
    if (notifier == null) {
      return IconButton(tooltip: tooltip, onPressed: null, icon: Icon(icon));
    }
    return ValueListenableBuilder<bool>(
      valueListenable: notifier,
      builder: (context, value, _) => IconButton(
        tooltip: tooltip,
        onPressed: value ? onPressed : null,
        icon: Icon(icon),
      ),
    );
  }
}
