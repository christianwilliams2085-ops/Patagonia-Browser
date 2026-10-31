import 'dart:collection';
import 'dart:convert';

import 'package:flutter/foundation.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'navigation_input.dart';
import 'local_assistant.dart';
import 'privacy_protection.dart';
import 'web_permissions.dart';

const _navy = Color(0xFF071827);
const _surface = Color(0xFF102B41);
const _surfaceLight = Color(0xFF173B56);
const _blue = Color(0xFF50A7D8);
const _green = Color(0xFF35D35B);
const _muted = Color(0xFFAEC0CF);
const _privacyPolicyUrl =
    'https://github.com/christianwilliams2085-ops/Patagonia-Browser/blob/main/PRIVACY.md';

class BrowserShell extends StatefulWidget {
  const BrowserShell({super.key});

  @override
  State<BrowserShell> createState() => _BrowserShellState();
}

class _BrowserShellState extends State<BrowserShell> {
  final TextEditingController _address = TextEditingController();
  final FocusNode _addressFocus = FocusNode();
  final List<_BrowserTab> _tabs = [];
  final List<_SavedPage> _favorites = [];
  final List<_SavedPage> _history = [];
  final Set<String> _unprotectedHosts = {};
  int _currentIndex = 0;
  int _nextTabId = 1;
  bool _preferencesReady = false;
  bool _handlingBack = false;
  String _youtubeDocumentStartSource = '';
  Future<void> _pendingSave = Future<void>.value();

  bool _isLive(_BrowserTab tab) => mounted && _tabs.contains(tab);

  Future<void> _withController(
    _BrowserTab tab,
    Future<void> Function(InAppWebViewController) action,
  ) async {
    final controller = tab.controller;
    if (!_isLive(tab) || controller == null) return;
    try {
      await action(controller);
    } on PlatformException {
      if (_isLive(tab) && identical(controller, tab.controller)) {
        _showMessage('No se pudo completar la acción. Volvé a intentarlo.');
      }
    } on MissingPluginException {
      // A native WebView may have been disposed while awaiting a command.
    }
  }

  _BrowserTab get _current => _tabs[_currentIndex];

  @override
  void initState() {
    super.initState();
    _tabs.add(_BrowserTab(id: _nextTabId++));
    _loadPreferences();
  }

  @override
  void dispose() {
    _address.dispose();
    _addressFocus.dispose();
    super.dispose();
  }

  Future<void> _loadPreferences() async {
    final youtubeScript = PrivacyProtection.youtubeProtectionScript;
    try {
      final preferences = await SharedPreferences.getInstance();
      if (!mounted) return;
      setState(() {
        _favorites
          ..clear()
          ..addAll(_decodePages(preferences.getStringList('favorites')));
        _history
          ..clear()
          ..addAll(_decodePages(preferences.getStringList('history')));
        _unprotectedHosts
          ..clear()
          ..addAll(preferences.getStringList('unprotectedHosts') ?? const []);
      });
    } catch (_) {
      _showMessage('No pudimos leer los favoritos y el historial guardados.');
    }
    try {
      final source = await youtubeScript;
      if (mounted) _youtubeDocumentStartSource = source;
    } catch (_) {
      if (mounted) {
        _showMessage('No se pudo cargar la protección preventiva de YouTube.');
      }
    }
    if (mounted) setState(() => _preferencesReady = true);
  }

  UnmodifiableListView<UserScript>? _initialProtectionScripts(_BrowserTab tab) {
    if (defaultTargetPlatform != TargetPlatform.android ||
        !tab.protectionEnabled ||
        _youtubeDocumentStartSource.isEmpty) {
      return null;
    }
    return UnmodifiableListView([
      PrivacyProtection.youtubeDocumentStartScript(_youtubeDocumentStartSource),
    ]);
  }

  Future<void> _syncDocumentStartProtection(
    InAppWebViewController controller, {
    required bool enabled,
  }) async {
    if (defaultTargetPlatform != TargetPlatform.android) return;
    await controller.removeUserScriptsByGroupName(
      groupName: PrivacyProtection.youtubeScriptGroup,
    );
    if (enabled && _youtubeDocumentStartSource.isNotEmpty) {
      await controller.addUserScript(
        userScript: PrivacyProtection.youtubeDocumentStartScript(
          _youtubeDocumentStartSource,
        ),
      );
    }
  }

  List<_SavedPage> _decodePages(List<String>? values) {
    if (values == null) return [];
    return values
        .map((value) {
          try {
            return _SavedPage.fromJson(
              jsonDecode(value) as Map<String, dynamic>,
            );
          } catch (_) {
            return null;
          }
        })
        .whereType<_SavedPage>()
        .where((page) => NavigationInput.isWebUri(Uri.tryParse(page.url)))
        .toList();
  }

  Future<void> _saveStrings(String key, List<String> values) {
    final snapshot = List<String>.of(values);
    _pendingSave = _pendingSave.then((_) async {
      try {
        final preferences = await SharedPreferences.getInstance();
        if (!await preferences.setStringList(key, snapshot)) {
          _showMessage('No pudimos guardar los cambios en el teléfono.');
        }
      } catch (_) {
        _showMessage('No pudimos guardar los cambios en el teléfono.');
      }
    });
    return _pendingSave;
  }

  Future<void> _savePages(String key, List<_SavedPage> pages) => _saveStrings(
    key,
    pages.map((page) => jsonEncode(page.toJson())).toList(),
  );

  void _syncAddress() {
    _address.text = _current.url?.toString() ?? '';
  }

  Future<void> _navigate(String value) async {
    final uri = NavigationInput.resolve(value);
    final tab = _current;
    final shouldProtect = !_unprotectedHosts.contains(uri.host.toLowerCase());
    _addressFocus.unfocus();
    _address.text = uri.toString();

    if (tab.controller == null) {
      setState(() {
        if (tab.renderProcessGone) tab.generation++;
        tab.renderProcessGone = false;
        tab.url = uri;
        tab.protectionEnabled = shouldProtect;
        tab.errorMessage = null;
      });
      return;
    }

    await _withController(tab, (controller) async {
      if (tab.protectionEnabled != shouldProtect) {
        setState(() => tab.protectionEnabled = shouldProtect);
        await _syncDocumentStartProtection(controller, enabled: shouldProtect);
        await controller.setSettings(settings: _webSettings(tab));
      }
      if (_isLive(tab) && identical(controller, tab.controller)) {
        await controller.loadUrl(urlRequest: URLRequest(url: WebUri.uri(uri)));
      }
    });
  }

  void _openHome() {
    setState(() {
      _current.generation++;
      _current.windowId = null;
      _current.renderProcessGone = false;
      _current.resetCounters();
      _current
        ..url = null
        ..title = 'Nueva pestaña'
        ..controller = null
        ..progress = 0
        ..protectionEnabled = true
        ..errorMessage = null;
      _address.clear();
    });
  }

  void _addTab({Uri? url, int? windowId}) {
    setState(() {
      _tabs.add(
        _BrowserTab(id: _nextTabId++, url: url, windowId: windowId)
          ..protectionEnabled =
              url == null ||
              !_unprotectedHosts.contains(url.host.toLowerCase()),
      );
      _currentIndex = _tabs.length - 1;
      _syncAddress();
    });
  }

  void _selectTab(int index) {
    if (index < 0 || index >= _tabs.length) return;
    setState(() {
      _currentIndex = index;
      _syncAddress();
    });
  }

  void _closeTabAt(int index) {
    if (index < 0 || index >= _tabs.length) return;
    setState(() {
      _tabs[index].generation++;
      _tabs[index].controller = null;
      _tabs.removeAt(index);
      if (_tabs.isEmpty) {
        _tabs.add(_BrowserTab(id: _nextTabId++));
        _currentIndex = 0;
      } else if (_currentIndex >= _tabs.length) {
        _currentIndex = _tabs.length - 1;
      } else if (index < _currentIndex) {
        _currentIndex--;
      }
      _syncAddress();
    });
  }

  Future<void> _goBack() => _withController(_current, (controller) async {
    if (await controller.canGoBack()) await controller.goBack();
  });

  Future<void> _goForward() => _withController(_current, (controller) async {
    if (await controller.canGoForward()) await controller.goForward();
  });

  Future<void> _handleSystemBack() async {
    if (_handlingBack) return;
    _handlingBack = true;
    final tab = _current;
    var navigated = false;
    try {
      await _withController(tab, (controller) async {
        if (await controller.canGoBack()) {
          if (_isLive(tab) && identical(tab, _current)) {
            navigated = true;
            await controller.goBack();
          }
        }
      });
      if (navigated || !_isLive(tab) || !identical(tab, _current)) return;
      if (_tabs.length > 1) {
        _closeTabAt(_currentIndex);
      } else if (tab.url != null) {
        _openHome();
      } else {
        await SystemNavigator.pop();
      }
    } finally {
      _handlingBack = false;
    }
  }

  Future<void> _prepareNavigation(_BrowserTab tab, Uri? url) async {
    if (!_isLive(tab) || !NavigationInput.isWebUri(url)) return;
    final enabled = !_unprotectedHosts.contains(url!.host.toLowerCase());
    if (tab.protectionEnabled != enabled) {
      setState(() => tab.protectionEnabled = enabled);
      await _withController(tab, (controller) async {
        await _syncDocumentStartProtection(controller, enabled: enabled);
        await controller.setSettings(settings: _webSettings(tab));
      });
    }
  }

  void _onLoadStart(_BrowserTab tab, Uri? url) {
    if (!_isLive(tab)) return;
    tab.resetCounters();
    _onUrlChanged(tab, url);
    _prepareNavigation(tab, url);
  }

  void _onUrlChanged(_BrowserTab tab, Uri? url) {
    if (!_isLive(tab) || url == null) return;
    final changed = tab.url != url;
    setState(() {
      tab.url = url;
      tab.errorMessage = null;
      if (identical(tab, _current) && !_addressFocus.hasFocus) {
        _address.text = url.toString();
      }
    });
    if (changed) _prepareNavigation(tab, url);
  }

  void _onTitleChanged(_BrowserTab tab, String? title) {
    if (!_isLive(tab) || title == null || title.trim().isEmpty) return;
    setState(() => tab.title = title.trim());
  }

  void _onProgressChanged(_BrowserTab tab, int progress) {
    if (!_isLive(tab)) return;
    setState(() => tab.progress = progress / 100);
  }

  Future<void> _injectPageProtection(_BrowserTab tab, Uri? url) async {
    if (defaultTargetPlatform != TargetPlatform.android ||
        !_isLive(tab) ||
        !tab.protectionEnabled ||
        !NavigationInput.isWebUri(url)) {
      return;
    }
    final generation = tab.generation;
    final script = await PrivacyProtection.pageScript(url);
    if (!_isLive(tab) ||
        tab.generation != generation ||
        tab.url != url ||
        !tab.protectionEnabled) {
      return;
    }
    await _withController(tab, (controller) async {
      await controller.evaluateJavascript(source: script);
    });
  }

  Future<void> _onPageFinished(_BrowserTab tab, Uri? url) async {
    if (!_isLive(tab) ||
        tab.errorMessage != null ||
        !NavigationInput.isWebUri(url)) {
      return;
    }
    final entry = _SavedPage(title: tab.title, url: url.toString());
    setState(() {
      tab.progress = 1;
      _history.removeWhere((item) => item.url == entry.url);
      _history.insert(0, entry);
      if (_history.length > 100) _history.removeRange(100, _history.length);
    });
    await _injectPageProtection(tab, url);
    await _savePages('history', _history);
  }

  void _onBlockedResource(_BrowserTab tab, String value) {
    if (!_isLive(tab) ||
        !tab.protectionEnabled ||
        !tab.seenBlockedResources.add(value)) {
      return;
    }
    final kind = PrivacyProtection.classify(value);
    if (kind == null || !mounted) return;
    setState(() {
      if (kind == BlockedKind.advertisement) {
        tab.blockedAds++;
      } else {
        tab.blockedTrackers++;
      }
    });
  }

  bool get _isCurrentFavorite {
    final url = _current.url?.toString();
    return url != null && _favorites.any((item) => item.url == url);
  }

  Future<void> _toggleFavorite() async {
    final url = _current.url;
    if (!NavigationInput.isWebUri(url)) {
      _showMessage('Abrí una página para agregarla a favoritos.');
      return;
    }
    final value = url.toString();
    final existing = _favorites.indexWhere((item) => item.url == value);
    setState(() {
      if (existing >= 0) {
        _favorites.removeAt(existing);
      } else {
        _favorites.insert(0, _SavedPage(title: _current.title, url: value));
      }
    });
    await _savePages('favorites', _favorites);
    _showMessage(
      existing >= 0 ? 'Quitado de favoritos.' : 'Guardado en favoritos.',
    );
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<AssistantPageContext> _readAssistantContext() async {
    final tab = _current;
    final controller = tab.controller;
    if (tab.url == null || controller == null) {
      return const AssistantPageContext(title: '', url: '', text: '');
    }

    try {
      final raw = await controller.evaluateJavascript(
        source: '''
          (() => JSON.stringify({
            title: document.title || '',
            url: window.location.href || '',
            text: (document.body?.innerText || '').slice(0, 30000)
          }))()
        ''',
      );
      final decoded = raw is String ? jsonDecode(raw) : raw;
      if (decoded is Map) {
        return AssistantPageContext(
          title: decoded['title']?.toString() ?? tab.title,
          url: decoded['url']?.toString() ?? tab.url.toString(),
          text: decoded['text']?.toString() ?? '',
        );
      }
    } catch (_) {
      // Algunas páginas protegidas no permiten leer su texto. El asistente
      // mantiene disponibles el título y la dirección en esos casos.
    }

    return AssistantPageContext(
      title: tab.title,
      url: tab.url.toString(),
      text: '',
    );
  }

  void _showAssistant() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: _navy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) =>
          _AssistantSheet(loadContext: _readAssistantContext),
    );
  }

  Future<void> _setProtection(_BrowserTab tab, bool enabled) async {
    final host = tab.url?.host.toLowerCase();
    if (!_isLive(tab) || host == null || host.isEmpty) return;
    if (enabled) {
      _unprotectedHosts.remove(host);
    } else {
      _unprotectedHosts.add(host);
    }
    final affected = _tabs
        .where((item) => item.url?.host.toLowerCase() == host)
        .toList();
    setState(() {
      for (final item in affected) {
        item.protectionEnabled = enabled;
        item.resetCounters();
      }
    });
    await _saveStrings('unprotectedHosts', _unprotectedHosts.toList());
    for (final item in affected) {
      await _withController(item, (controller) async {
        await _syncDocumentStartProtection(controller, enabled: enabled);
        await controller.setSettings(settings: _webSettings(item));
        if (_isLive(item) && identical(controller, item.controller)) {
          await controller.reload();
        }
      });
    }
  }

  Future<void> _setDesktopMode(bool enabled) async {
    final tab = _current;
    setState(() => tab.desktopMode = enabled);
    await _withController(tab, (controller) async {
      await controller.setSettings(settings: _webSettings(tab));
      if (_isLive(tab) && identical(controller, tab.controller)) {
        await controller.reload();
      }
    });
  }

  InAppWebViewSettings _webSettings(_BrowserTab tab) => InAppWebViewSettings(
    javaScriptEnabled: true,
    domStorageEnabled: true,
    databaseEnabled: true,
    cacheEnabled: true,
    supportZoom: true,
    safeBrowsingEnabled: true,
    allowsBackForwardNavigationGestures: true,
    allowsInlineMediaPlayback: true,
    // Keep WebView audio alive when Home is pressed, another app is opened or
    // the screen is locked. User-initiated playback is still required below.
    allowBackgroundAudioPlaying: true,
    mediaPlaybackRequiresUserGesture: true,
    useShouldOverrideUrlLoading: true,
    useOnRenderProcessGone: true,
    useShouldInterceptRequest: defaultTargetPlatform == TargetPlatform.android,
    thirdPartyCookiesEnabled: !tab.protectionEnabled,
    allowFileAccess: false,
    allowContentAccess: false,
    allowFileAccessFromFileURLs: false,
    allowUniversalAccessFromFileURLs: false,
    supportMultipleWindows: true,
    javaScriptCanOpenWindowsAutomatically: false,
    preferredContentMode: tab.desktopMode
        ? UserPreferredContentMode.DESKTOP
        : UserPreferredContentMode.RECOMMENDED,
    contentBlockers:
        tab.protectionEnabled && defaultTargetPlatform != TargetPlatform.android
        ? PrivacyProtection.rules()
        : [],
  );

  @override
  Widget build(BuildContext context) {
    if (!_preferencesReady) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _handleSystemBack();
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              if (_current.progress > 0 && _current.progress < 1)
                LinearProgressIndicator(
                  value: _current.progress,
                  minHeight: 2,
                  color: _blue,
                  backgroundColor: _surface,
                ),
              Expanded(
                child: IndexedStack(
                  index: _currentIndex,
                  children: _tabs
                      .map(
                        (tab) => _TabContent(
                          key: ValueKey('${tab.id}:${tab.generation}'),
                          isActive: identical(tab, _current),
                          tab: tab,
                          settings: _webSettings(tab),
                          initialUserScripts: _initialProtectionScripts(tab),
                          onNavigate: _navigate,
                          onController: (controller) {
                            if (_isLive(tab)) tab.controller = controller;
                          },
                          onLoadStart: (url) => _onLoadStart(tab, url),
                          onPrepareNavigation: (url) =>
                              _prepareNavigation(tab, url),
                          onUrlChanged: (url) => _onUrlChanged(tab, url),
                          onTitleChanged: (title) =>
                              _onTitleChanged(tab, title),
                          onProgressChanged: (value) =>
                              _onProgressChanged(tab, value),
                          onPageCommitVisible: (url) =>
                              _injectPageProtection(tab, url),
                          onPageFinished: (url) => _onPageFinished(tab, url),
                          onBlockedResource: (url) =>
                              _onBlockedResource(tab, url),
                          onNewWindow: (action) {
                            if (!_isLive(tab) ||
                                !identical(tab, _current) ||
                                action.hasGesture == false) {
                              return false;
                            }
                            final url = action.request.url;
                            if (url != null &&
                                url.toString() != 'about:blank' &&
                                !NavigationInput.isWebUri(url)) {
                              return false;
                            }
                            _addTab(url: url, windowId: action.windowId);
                            return true;
                          },
                          onRenderProcessGone: () {
                            if (!_isLive(tab)) return;
                            setState(() {
                              tab.controller = null;
                              tab.renderProcessGone = true;
                              tab.windowId = null;
                              tab.errorMessage = 'La página se cerró. Tocá Volver a intentar para abrirla.';
                              tab.progress = 1;
                            });
                          },
                          onCloseWindow: () {
                            if (_isLive(tab)) _closeTabAt(_tabs.indexOf(tab));
                          },
                          onError: (message) {
                            if (_isLive(tab)) {
                              setState(() {
                                tab.errorMessage = message;
                                tab.progress = 1;
                              });
                            }
                          },
                        ),
                      )
                      .toList(),
                ),
              ),
              _buildBottomBar(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF071827), Color(0xFF102D45)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        border: Border(bottom: BorderSide(color: Color(0x3350A7D8))),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 10),
        child: Column(
          children: [
            Row(
              children: [
                ClipOval(
                  child: Image.asset(
                    'assets/patagonia-emblema.png',
                    width: 34,
                    height: 34,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(width: 9),
                const Expanded(
                  child: Text(
                    'Patagonia Browser',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600),
                  ),
                ),
                IconButton(
                  tooltip: 'Patagonia AI',
                  onPressed: _showAssistant,
                  icon: const Icon(Icons.auto_awesome, color: _blue),
                ),
                IconButton(
                  tooltip: 'Centro de Privacidad',
                  onPressed: _showPrivacyCenter,
                  icon: Icon(
                    Icons.shield_outlined,
                    color: _current.protectionEnabled ? _green : _muted,
                  ),
                ),
                Semantics(
                  button: true,
                  label: '${_tabs.length} pestañas abiertas',
                  child: InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: _showTabs,
                    child: Container(
                      width: 31,
                      height: 31,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: _muted),
                        borderRadius: BorderRadius.circular(7),
                      ),
                      child: Text(
                        '${_tabs.length}',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 7),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: const Color(0xD90A1D2E),
                      borderRadius: BorderRadius.circular(23),
                      border: Border.all(color: const Color(0x5550A7D8)),
                    ),
                    child: TextField(
                      controller: _address,
                      focusNode: _addressFocus,
                      textInputAction: TextInputAction.go,
                      keyboardType: TextInputType.url,
                      autocorrect: false,
                      enableSuggestions: false,
                      onSubmitted: _navigate,
                      onTap: () => _address.selection = TextSelection(
                        baseOffset: 0,
                        extentOffset: _address.text.length,
                      ),
                      decoration: InputDecoration(
                        border: InputBorder.none,
                        hintText: 'Buscar o escribir una dirección',
                        hintStyle: const TextStyle(color: _muted),
                        prefixIcon: Icon(
                          _current.url == null
                              ? Icons.search
                              : _current.url!.scheme == 'https'
                              ? Icons.lock_outline
                              : Icons.warning_amber_rounded,
                          color: _current.url == null
                              ? _muted
                              : _current.url!.scheme == 'https'
                              ? _green
                              : const Color(0xFFFFC857),
                          size: 21,
                        ),
                        suffixIcon: _current.url == null
                            ? null
                            : IconButton(
                                tooltip: _isCurrentFavorite
                                    ? 'Quitar de favoritos'
                                    : 'Agregar a favoritos',
                                onPressed: _toggleFavorite,
                                icon: Icon(
                                  _isCurrentFavorite
                                      ? Icons.star
                                      : Icons.star_border,
                                  color: _isCurrentFavorite
                                      ? const Color(0xFFFFC857)
                                      : _muted,
                                ),
                              ),
                        contentPadding: const EdgeInsets.symmetric(
                          vertical: 12,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 5),
                IconButton(
                  tooltip: 'Menú',
                  onPressed: _showMenu,
                  icon: const Icon(Icons.more_vert),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      decoration: const BoxDecoration(
        color: _navy,
        border: Border(top: BorderSide(color: Color(0x3350A7D8))),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          IconButton(
            tooltip: 'Atrás',
            onPressed: _goBack,
            icon: const Icon(Icons.arrow_back),
          ),
          IconButton(
            tooltip: 'Adelante',
            onPressed: _goForward,
            icon: const Icon(Icons.arrow_forward),
          ),
          IconButton(
            tooltip: 'Inicio',
            onPressed: _openHome,
            icon: const Icon(Icons.home_outlined),
          ),
          IconButton(
            tooltip: 'Pestañas',
            onPressed: _showTabs,
            icon: const Icon(Icons.tab_outlined),
          ),
          IconButton(
            tooltip: _current.progress > 0 && _current.progress < 1
                ? 'Detener'
                : 'Recargar',
            onPressed: () {
              final controller = _current.controller;
              if (controller == null) return;
              if (_current.progress > 0 && _current.progress < 1) {
                _withController(_current, (view) => view.stopLoading());
                setState(() => _current.progress = 1);
              } else {
                _withController(_current, (view) => view.reload());
              }
            },
            icon: Icon(
              _current.progress > 0 && _current.progress < 1
                  ? Icons.close
                  : Icons.refresh,
            ),
          ),
        ],
      ),
    );
  }

  void _showPrivacyCenter() {
    final tab = _current;
    var applying = false;
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _navy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 42,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0x667F9AAF),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(height: 18),
                const Row(
                  children: [
                    Icon(Icons.shield_outlined, color: _green, size: 30),
                    SizedBox(width: 12),
                    Text(
                      'Centro de Privacidad',
                      style: TextStyle(
                        fontSize: 21,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                Material(
                  color: _surface,
                  borderRadius: BorderRadius.circular(14),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 5,
                    ),
                    child: SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Protección en este sitio'),
                      subtitle: Text(
                        tab.protectionEnabled ? 'Activa' : 'Desactivada',
                        style: TextStyle(
                          color: tab.protectionEnabled ? _green : _muted,
                        ),
                      ),
                      value: tab.protectionEnabled,
                      activeThumbColor: _green,
                      onChanged: applying || tab.url?.host.isNotEmpty != true
                          ? null
                          : (enabled) async {
                              setSheetState(() => applying = true);
                              await _setProtection(tab, enabled);
                              if (sheetContext.mounted) {
                                setSheetState(() => applying = false);
                              }
                            },
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                _PrivacyRow(
                  icon: Icons.block,
                  color: const Color(0xFFFF5353),
                  label: 'Anuncios bloqueados',
                  value: defaultTargetPlatform == TargetPlatform.android
                      ? tab.blockedAds
                      : null,
                ),
                _PrivacyRow(
                  icon: Icons.visibility_outlined,
                  color: _green,
                  label: 'Rastreadores bloqueados',
                  value: defaultTargetPlatform == TargetPlatform.android
                      ? tab.blockedTrackers
                      : null,
                ),
                const Divider(height: 28, color: Color(0x336F8DA5)),
                if (defaultTargetPlatform != TargetPlatform.android)
                  const Text(
                    'El motor de iPhone no informa el número de bloqueos.',
                    style: TextStyle(color: _muted),
                  ),
                const SizedBox(height: 18),
                const Text(
                  'Patagonia bloquea redes publicitarias y rastreadores conocidos antes de que carguen. Los permisos de cámara, micrófono y ubicación se preguntan por separado.',
                  style: TextStyle(color: _muted, height: 1.4),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showTabs() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _navy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => SafeArea(
          child: SizedBox(
            height: MediaQuery.sizeOf(context).height * .72,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 12, 8),
                  child: Row(
                    children: [
                      const Expanded(
                        child: Text(
                          'Pestañas',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      FilledButton.icon(
                        onPressed: () {
                          _addTab();
                          Navigator.pop(sheetContext);
                        },
                        icon: const Icon(Icons.add),
                        label: const Text('Nueva'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(10),
                    itemCount: _tabs.length,
                    itemBuilder: (context, index) {
                      final tab = _tabs[index];
                      return Card(
                        color: index == _currentIndex
                            ? _surfaceLight
                            : _surface,
                        child: ListTile(
                          leading: tab.url == null
                              ? ClipOval(
                                  child: Image.asset(
                                    'assets/patagonia-emblema.png',
                                    width: 32,
                                    height: 32,
                                  ),
                                )
                              : const Icon(Icons.public, color: _blue),
                          title: Text(
                            tab.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Text(
                            tab.url?.host ?? 'Inicio de Patagonia',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () {
                            _selectTab(index);
                            Navigator.pop(sheetContext);
                          },
                          trailing: IconButton(
                            tooltip: 'Cerrar pestaña',
                            onPressed: () {
                              _closeTabAt(index);
                              setSheetState(() {});
                            },
                            icon: const Icon(Icons.close),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showMenu() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: _navy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _MenuTile(
                icon: Icons.add_box_outlined,
                label: 'Nueva pestaña',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _addTab();
                },
              ),
              _MenuTile(
                icon: _isCurrentFavorite ? Icons.star : Icons.star_border,
                label: _isCurrentFavorite
                    ? 'Quitar de favoritos'
                    : 'Agregar a favoritos',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _toggleFavorite();
                },
              ),
              _MenuTile(
                icon: Icons.bookmarks_outlined,
                label: 'Favoritos',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showSavedPages('Favoritos', _favorites);
                },
              ),
              _MenuTile(
                icon: Icons.history,
                label: 'Historial',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showSavedPages('Historial', _history);
                },
              ),
              SwitchListTile(
                secondary: const Icon(Icons.desktop_windows_outlined),
                title: const Text('Sitio de escritorio'),
                value: _current.desktopMode,
                activeThumbColor: _blue,
                onChanged: (enabled) {
                  Navigator.pop(sheetContext);
                  _setDesktopMode(enabled);
                },
              ),
              _MenuTile(
                icon: Icons.auto_awesome,
                label: 'Patagonia AI',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showAssistant();
                },
              ),
              _MenuTile(
                icon: Icons.shield_outlined,
                label: 'Centro de Privacidad',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _showPrivacyCenter();
                },
              ),
              _MenuTile(
                icon: Icons.policy_outlined,
                label: 'Política de privacidad',
                onTap: () {
                  Navigator.pop(sheetContext);
                  _navigate(_privacyPolicyUrl);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSavedPages(String title, List<_SavedPage> sourcePages) {
    final pages = List<_SavedPage>.of(sourcePages);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: _navy,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(sheetContext).height * .7,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 18, 12, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        title,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (title == 'Historial' && pages.isNotEmpty)
                      TextButton(
                        onPressed: () {
                          setState(() => _history.clear());
                          _savePages('history', _history);
                          Navigator.pop(sheetContext);
                        },
                        child: const Text('Borrar'),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: pages.isEmpty
                    ? Center(
                        child: Text(
                          title == 'Favoritos'
                              ? 'Todavía no guardaste favoritos.'
                              : 'El historial está vacío.',
                          style: const TextStyle(color: _muted),
                        ),
                      )
                    : ListView.separated(
                        itemCount: pages.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final page = pages[index];
                          return ListTile(
                            leading: const Icon(Icons.public, color: _blue),
                            title: Text(
                              page.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              page.url,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            onTap: () {
                              Navigator.pop(sheetContext);
                              _navigate(page.url);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TabContent extends StatefulWidget {
  const _TabContent({
    super.key,
    required this.tab,
    required this.isActive,
    required this.settings,
    required this.initialUserScripts,
    required this.onNavigate,
    required this.onController,
    required this.onLoadStart,
    required this.onPrepareNavigation,
    required this.onUrlChanged,
    required this.onTitleChanged,
    required this.onProgressChanged,
    required this.onPageCommitVisible,
    required this.onPageFinished,
    required this.onBlockedResource,
    required this.onNewWindow,
    required this.onCloseWindow,
    required this.onRenderProcessGone,
    required this.onError,
  });

  final _BrowserTab tab;
  final bool isActive;
  final InAppWebViewSettings settings;
  final UnmodifiableListView<UserScript>? initialUserScripts;
  final ValueChanged<String> onNavigate;
  final ValueChanged<InAppWebViewController> onController;
  final ValueChanged<Uri?> onLoadStart;
  final Future<void> Function(Uri?) onPrepareNavigation;
  final ValueChanged<Uri?> onUrlChanged;
  final ValueChanged<String?> onTitleChanged;
  final ValueChanged<int> onProgressChanged;
  final ValueChanged<Uri?> onPageCommitVisible;
  final ValueChanged<Uri?> onPageFinished;
  final ValueChanged<String> onBlockedResource;
  final bool Function(CreateWindowAction action) onNewWindow;
  final VoidCallback onCloseWindow;
  final VoidCallback onRenderProcessGone;
  final ValueChanged<String> onError;

  @override
  State<_TabContent> createState() => _TabContentState();
}

class _TabContentState extends State<_TabContent> {
  late final int _generation = widget.tab.generation;
  bool get _alive => mounted && widget.tab.generation == _generation;
  int _navigation = 0;
  bool _askingPermission = false;

  bool _canGrant(String origin, int navigation) =>
      _alive &&
      widget.isActive &&
      navigation == _navigation &&
      WebPermissions.sameSecureOrigin(origin, widget.tab.url);

  Future<bool> _requestPermission(
    String origin,
    String description,
    List<String> devicePermissions,
  ) async {
    final navigation = _navigation;
    if (_askingPermission || !_canGrant(origin, navigation)) return false;
    _askingPermission = true;
    try {
      final allowed =
          await showDialog<bool>(
            context: context,
            builder: (dialogContext) => AlertDialog(
              icon: const Icon(Icons.privacy_tip_outlined, color: _blue),
              title: Text('Permitir $description'),
              content: Text(
                '$origin solicita acceso a $description. ¿Querés permitirlo?',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogContext, false),
                  child: const Text('Bloquear'),
                ),
                FilledButton(
                  onPressed: () => Navigator.pop(dialogContext, true),
                  child: const Text('Permitir'),
                ),
              ],
            ),
          ) ??
          false;
      if (!allowed || !_canGrant(origin, navigation)) return false;
      final granted = await WebPermissions.requestDevice(devicePermissions);
      return granted && _canGrant(origin, navigation);
    } finally {
      _askingPermission = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.tab.url == null && widget.tab.windowId == null) {
      return _StartPage(onNavigate: widget.onNavigate);
    }

    return Stack(
      children: [
        if (!widget.tab.renderProcessGone)
          InAppWebView(
            windowId: widget.tab.windowId,
            initialUrlRequest:
                widget.tab.windowId == null && widget.tab.url != null
                ? URLRequest(url: WebUri.uri(widget.tab.url!))
                : null,
            initialSettings: widget.settings,
            initialUserScripts: widget.initialUserScripts,
            onWebViewCreated: (controller) {
              if (_alive) widget.onController(controller);
            },
            onLoadStart: (controller, url) {
              if (!_alive) return;
              _navigation++;
              widget.onLoadStart(url);
            },
            onPageCommitVisible: (controller, url) {
              if (_alive) widget.onPageCommitVisible(url);
            },
            onLoadStop: (controller, url) {
              if (_alive) widget.onPageFinished(url);
            },
            onUpdateVisitedHistory: (controller, url, isReload) {
              if (_alive) widget.onUrlChanged(url);
            },
            onTitleChanged: (controller, title) {
              if (_alive) widget.onTitleChanged(title);
            },
            onProgressChanged: (controller, progress) {
              if (_alive) widget.onProgressChanged(progress);
            },
            shouldInterceptRequest: (controller, request) async {
              if (!_alive || !widget.tab.protectionEnabled) return null;
              final value = request.url.toString();
              final kind = PrivacyProtection.blockedRequest(
                value,
                isMainFrame: request.isForMainFrame ?? true,
              );
              if (kind == null) return null;
              widget.onBlockedResource(value);
              return WebResourceResponse(
                contentType: 'text/plain',
                contentEncoding: 'utf-8',
                statusCode: 403,
                reasonPhrase: 'Blocked by Patagonia',
                data: Uint8List(0),
              );
            },
            shouldOverrideUrlLoading: (controller, action) async {
              if (!_alive) return NavigationActionPolicy.CANCEL;
              final url = action.request.url;
              if (url?.toString() == 'about:blank') {
                return NavigationActionPolicy.ALLOW;
              }
              if (!NavigationInput.isWebUri(url)) {
                return NavigationActionPolicy.CANCEL;
              }
              if (action.isForMainFrame) await widget.onPrepareNavigation(url);
              return mounted
                  ? NavigationActionPolicy.ALLOW
                  : NavigationActionPolicy.CANCEL;
            },
            onCreateWindow: (controller, action) async =>
                _alive && widget.onNewWindow(action),
            onCloseWindow: (controller) {
              if (_alive) widget.onCloseWindow();
            },
            onPermissionRequest: (controller, request) async {
              final supported =
                  request.resources.isNotEmpty &&
                  request.resources.every(
                    (resource) => WebPermissions.name(resource) != null,
                  );
              final allowed =
                  supported &&
                  await _requestPermission(
                    request.origin.toString(),
                    request.resources.map(WebPermissions.name).join(' y '),
                    WebPermissions.devicePermissions(request.resources),
                  );
              return PermissionResponse(
                resources: allowed ? request.resources : [],
                action: allowed
                    ? PermissionResponseAction.GRANT
                    : PermissionResponseAction.DENY,
              );
            },
            onPermissionRequestCanceled: (controller, request) {
              _navigation++;
            },
            onGeolocationPermissionsShowPrompt: (controller, origin) async {
              final allowed = await _requestPermission(origin, 'tu ubicación', [
                'location',
              ]);
              return GeolocationPermissionShowPromptResponse(
                origin: origin,
                allow: allowed,
                retain: false,
              );
            },
            onGeolocationPermissionsHidePrompt: (controller) {
              _navigation++;
            },
            onReceivedError: (controller, request, error) {
              if (_alive && (request.isForMainFrame ?? false)) {
                widget.onError(
                  'No pudimos abrir esta página. Revisá la conexión e intentá otra vez.',
                );
              }
            },
            onRenderProcessGone: (controller, detail) {
              if (_alive) widget.onRenderProcessGone();
            },
            onWebContentProcessDidTerminate: (controller) {
              if (_alive) {
                widget.onError(
                  'La página se cerró. Tocá Volver a intentar para abrirla.',
                );
              }
            },
          ),
        if (widget.tab.errorMessage != null)
          Positioned.fill(
            child: ColoredBox(
              color: _navy,
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(28),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.cloud_off_outlined,
                        size: 56,
                        color: _muted,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        widget.tab.errorMessage!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 17, height: 1.4),
                      ),
                      const SizedBox(height: 18),
                      FilledButton.icon(
                        onPressed: () {
                          final url = widget.tab.url;
                          if (url != null) widget.onNavigate(url.toString());
                        },
                        icon: const Icon(Icons.refresh),
                        label: const Text('Volver a intentar'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _AssistantSheet extends StatefulWidget {
  const _AssistantSheet({required this.loadContext});

  final Future<AssistantPageContext> Function() loadContext;

  @override
  State<_AssistantSheet> createState() => _AssistantSheetState();
}

class _AssistantSheetState extends State<_AssistantSheet> {
  final TextEditingController _input = TextEditingController();
  final ScrollController _scroll = ScrollController();
  final List<_AssistantMessage> _messages = const [
    _AssistantMessage(
      text: 'Hola, soy Patagonia AI. Puedo resumir la página abierta, mostrar su título o su dirección.',
      fromUser: false,
    ),
  ].toList();
  bool _working = false;

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _working) return;

    setState(() {
      _messages.add(_AssistantMessage(text: text, fromUser: true));
      _input.clear();
      _working = true;
    });
    _scrollToEnd();

    final pageContext = await widget.loadContext();
    final response = buildLocalAssistantResponse(
      message: text,
      context: pageContext,
    );
    if (!mounted) return;

    setState(() {
      _messages.add(_AssistantMessage(text: response, fromUser: false));
      _working = false;
    });
    _scrollToEnd();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.viewInsetsOf(context).bottom;
    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: bottomInset),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * .86,
        child: Column(
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(top: 10),
              decoration: BoxDecoration(
                color: const Color(0x667F9AAF),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 12, 8, 10),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0x333EA9E5),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: const Icon(Icons.auto_awesome, color: _blue),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Patagonia AI',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Asistente privado • funciona en el teléfono',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: _muted, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Cerrar asistente',
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            const Divider(height: 1, color: Color(0x3350A7D8)),
            Expanded(
              child: ListView.builder(
                controller: _scroll,
                padding: const EdgeInsets.fromLTRB(14, 16, 14, 10),
                itemCount: _messages.length + (_working ? 1 : 0),
                itemBuilder: (context, index) {
                  if (_working && index == _messages.length) {
                    return const Align(
                      alignment: Alignment.centerLeft,
                      child: Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: _blue,
                          ),
                        ),
                      ),
                    );
                  }
                  final message = _messages[index];
                  return Align(
                    alignment: message.fromUser
                        ? Alignment.centerRight
                        : Alignment.centerLeft,
                    child: Container(
                      constraints: const BoxConstraints(maxWidth: 520),
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 11,
                      ),
                      decoration: BoxDecoration(
                        color: message.fromUser
                            ? const Color(0xFF286F9E)
                            : _surface,
                        borderRadius: BorderRadius.circular(17),
                        border: Border.all(
                          color: message.fromUser
                              ? const Color(0x6650A7D8)
                              : const Color(0x334E7894),
                        ),
                      ),
                      child: Text(message.text),
                    ),
                  );
                },
              ),
            ),
            const Divider(height: 1, color: Color(0x3350A7D8)),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 10, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('assistant-input'),
                      controller: _input,
                      enabled: !_working,
                      minLines: 1,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Preguntá sobre esta página',
                        filled: true,
                        fillColor: const Color(0xFF0A2134),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(22),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    tooltip: 'Enviar mensaje',
                    onPressed: _working ? null : _send,
                    style: IconButton.styleFrom(backgroundColor: _blue),
                    icon: const Icon(Icons.arrow_upward, color: _navy),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AssistantMessage {
  const _AssistantMessage({required this.text, required this.fromUser});

  final String text;
  final bool fromUser;
}

class _StartPage extends StatelessWidget {
  const _StartPage({required this.onNavigate});

  final ValueChanged<String> onNavigate;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        image: DecorationImage(
          image: AssetImage('assets/patagonia-start.png'),
          fit: BoxFit.cover,
          alignment: Alignment.center,
        ),
      ),
      child: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0x66000000), Color(0xB3071827)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(22, 34, 22, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Center(
                child: Container(
                  key: const ValueKey('start-page-logo'),
                  width: 94,
                  height: 94,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black54,
                        blurRadius: 18,
                        offset: Offset(0, 7),
                      ),
                    ],
                  ),
                  child: ClipOval(
                    child: Image.asset(
                      'assets/patagonia-emblema.png',
                      fit: BoxFit.contain,
                      alignment: Alignment.center,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Patagonia Browser',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                  shadows: [Shadow(color: Colors.black87, blurRadius: 8)],
                ),
              ),
              const SizedBox(height: 3),
              const Text(
                'Navegá libre. Navegá seguro.',
                style: TextStyle(fontSize: 17, color: Color(0xFFE2EDF5)),
              ),
              const SizedBox(height: 28),
              Container(
                constraints: const BoxConstraints(maxWidth: 560),
                decoration: BoxDecoration(
                  color: const Color(0xE60A1D2E),
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xAA91B8CE)),
                  boxShadow: const [
                    BoxShadow(color: Colors.black38, blurRadius: 14),
                  ],
                ),
                child: TextField(
                  textInputAction: TextInputAction.search,
                  onSubmitted: onNavigate,
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    hintText: 'Buscar en la web',
                    prefixIcon: Icon(Icons.search, color: _blue),
                    contentPadding: EdgeInsets.symmetric(vertical: 15),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                alignment: WrapAlignment.center,
                children: [
                  _QuickLink(
                    icon: Icons.g_mobiledata,
                    label: 'Google',
                    color: const Color(0xFF4285F4),
                    onTap: () => onNavigate('https://www.google.com'),
                  ),
                  _QuickLink(
                    icon: Icons.play_arrow_rounded,
                    label: 'YouTube',
                    color: const Color(0xFFFF2D2D),
                    onTap: () => onNavigate('https://www.youtube.com'),
                  ),
                  _QuickLink(
                    icon: Icons.menu_book_outlined,
                    label: 'Wikipedia',
                    color: Colors.white,
                    onTap: () => onNavigate('https://es.wikipedia.org'),
                  ),
                  _QuickLink(
                    icon: Icons.mail_outline,
                    label: 'Gmail',
                    color: const Color(0xFFEA4335),
                    onTap: () => onNavigate('https://mail.google.com'),
                  ),
                ],
              ),
              const SizedBox(height: 34),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xCC0A1D2E),
                  borderRadius: BorderRadius.circular(22),
                  border: Border.all(color: const Color(0x5542D86B)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lock_outline, color: _green, size: 20),
                    SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        'Protección de privacidad activa',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'Abrir $label',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          width: 76,
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: const Color(0xD9132D42),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0x557F9AAF)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 7),
              Text(label, style: const TextStyle(fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PrivacyRow extends StatelessWidget {
  const _PrivacyRow({
    required this.icon,
    required this.color,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final Color color;
  final String label;
  final int? value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 9),
      child: Row(
        children: [
          Icon(icon, color: color, size: 25),
          const SizedBox(width: 13),
          Expanded(child: Text(label, style: const TextStyle(fontSize: 16))),
          Text(
            value?.toString() ?? '—',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(leading: Icon(icon), title: Text(label), onTap: onTap);
  }
}

class _BrowserTab {
  _BrowserTab({required this.id, this.url, this.windowId});

  int? windowId;
  int generation = 0;
  void resetCounters() {
    blockedAds = 0;
    blockedTrackers = 0;
    seenBlockedResources.clear();
  }

  final int id;
  Uri? url;
  String title = 'Nueva pestaña';
  InAppWebViewController? controller;
  double progress = 0;
  int blockedAds = 0;
  int blockedTrackers = 0;
  bool protectionEnabled = true;
  bool desktopMode = false;
  bool renderProcessGone = false;
  String? errorMessage;
  final Set<String> seenBlockedResources = {};
}

class _SavedPage {
  const _SavedPage({required this.title, required this.url});

  final String title;
  final String url;

  factory _SavedPage.fromJson(Map<String, dynamic> json) => _SavedPage(
    title: json['title'] as String? ?? 'Página',
    url: json['url'] as String? ?? '',
  );

  Map<String, String> toJson() => {'title': title, 'url': url};
}
