const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
// Usa el JDK de JAVA_HOME si está definido (Android Studio o el SDK local); si no, el java del PATH.
const java = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java') : 'java';

// Compile and execute the actual vendored Java classes. Only Android's
// framework, network I/O and the WebView are stubbed; rule evaluation is real.
const packageName = 'com.pichillilorenzo.flutter_inappwebview_android';
const javaRoot = `mobile/vendor/flutter_inappwebview_android/android/src/main/java/${packageName.replaceAll('.', '/')}`;
const stubs = {
  'androidx.annotation.NonNull': 'public @interface NonNull {}',
  'androidx.annotation.Nullable': 'public @interface Nullable {}',
  'android.os.Build': 'public class Build { public static class VERSION { public static int SDK_INT=34; } public static class VERSION_CODES { public static final int KITKAT=19, LOLLIPOP=21; } }',
  'android.os.Handler': 'public class Handler { public Handler(Object looper) {} public void post(Runnable task) { task.run(); } public void postDelayed(Runnable task, long delay) { task.run(); } }',
  'android.text.TextUtils': 'public class TextUtils { public static String join(CharSequence separator, Iterable<?> values) { return ""; } }',
  'android.util.Log': 'public class Log { public static int e(String tag, String message, Throwable error) { throw new AssertionError(error); } }',
  'android.webkit.WebResourceResponse': 'public class WebResourceResponse { public WebResourceResponse(String mime, String encoding, java.io.InputStream data) {} public WebResourceResponse(String mime, String encoding, int status, String reason, java.util.Map<String,String> headers, java.io.InputStream data) {} }',
  [`${packageName}.Util`]: 'public class Util { public static java.net.HttpURLConnection makeHttpRequest(String url, String method, java.util.Map<String,String> headers) { throw new AssertionError("Unexpected network call: " + url); } public static byte[] readAllBytes(java.io.InputStream input) { return new byte[0]; } }',
  [`${packageName}.plugin_scripts_js.JavaScriptBridgeJS`]: 'public class JavaScriptBridgeJS { public static final String JAVASCRIPT_BRIDGE_NAME="flutter_inappwebview"; }',
  [`${packageName}.types.WebResourceRequestExt`]: 'public class WebResourceRequestExt { private final String url; public WebResourceRequestExt(String url) { this.url=url; } public String getUrl(){return url;} public String getMethod(){return "GET";} public java.util.Map<String,String> getHeaders(){return java.util.Collections.emptyMap();} }',
  [`${packageName}.webview.in_app_webview.InAppWebView`]: 'public class InAppWebView { public static class Settings { public Object contentBlockers=new Object(); } public Settings customSettings=new Settings(); public java.util.List<String> scripts=new java.util.ArrayList<>(); public String url="https://m.youtube.com/watch?v=content"; public String getUrl(){return url;} public Object getWebViewLooper(){return null;} public void evaluateJavascript(String script,Object callback){scripts.add(script);} public void loadUrl(String script){scripts.add(script);} }',
};

const harness = `package ${packageName}.content_blocker;
import java.util.*;
import ${packageName}.types.WebResourceRequestExt;
import ${packageName}.webview.in_app_webview.InAppWebView;
public class RegressionTest {
  static ContentBlocker rule(List<String> domains, List<String> unless, List<String> types,
      List<String> load, List<String> top, List<String> unlessTop, String action) {
    Map<String,Object> trigger = new HashMap<>();
    trigger.put("url-filter", ".*");
    if (domains != null) trigger.put("if-domain", domains);
    if (unless != null) trigger.put("unless-domain", unless);
    if (types != null) trigger.put("resource-type", types);
    if (load != null) trigger.put("load-type", load);
    if (top != null) trigger.put("if-top-url", top);
    if (unlessTop != null) trigger.put("unless-top-url", unlessTop);
    Map<String,Object> actionMap = new HashMap<>();
    actionMap.put("type", action); actionMap.put("selector", ".fixture-ad");
    return new ContentBlocker(ContentBlockerTrigger.fromMap(trigger), ContentBlockerAction.fromMap(actionMap));
  }
  static ContentBlocker block(String... domains) { return rule(Arrays.asList(domains), null, null, null, null, null, "block"); }
  public static void main(String[] args) throws Exception {
    String name=args[0]; InAppWebView view=new InAppWebView();
    String url="https://www.google-analytics.com/collect";
    List<ContentBlocker> rules=new ArrayList<>(); boolean expected=true;
    switch(name) {
      case "domain": rules.add(block("doubleclick.net", "*.doubleclick.net")); break;
      case "resource": rules.add(rule(null,null,Arrays.asList("image"),null,null,null,"block")); break;
      case "unlessDomain": rules.add(rule(null,Arrays.asList("*.google-analytics.com"),null,null,null,null,"block")); break;
      case "loadType": rules.add(rule(null,null,null,Arrays.asList("first-party"),null,null,"block")); break;
      case "ifTopUrl": rules.add(rule(null,null,null,null,Arrays.asList("https://other.invalid/"),null,"block")); break;
      case "unlessTopUrl": rules.add(rule(null,null,null,null,null,Arrays.asList("https://m.youtube.com/"),"block")); break;
      case "lookalike": url="https://notdoubleclick.net/ad"; rules.add(block("doubleclick.net","*.doubleclick.net")); expected=false; break;
      case "media": url="https://r1.googlevideo.com/videoplayback?range=0-1024"; rules.add(block("doubleclick.net","*.doubleclick.net")); expected=false; break;
      case "css": rules.add(block("doubleclick.net","*.doubleclick.net")); rules.add(block("google-analytics.com","*.google-analytics.com"));
        url="https://example.invalid/page"; rules.add(rule(null,null,null,null,null,null,"css-display-none")); expected=false; break;
      default: throw new AssertionError(name);
    }
    if (!name.equals("css")) rules.add(block("google-analytics.com","*.google-analytics.com"));
    ContentBlockerHandler handler=new ContentBlockerHandler(rules);
    Object result=handler.checkUrl(view,new WebResourceRequestExt(url),ContentBlockerTriggerResourceType.MEDIA);
    if ((result!=null)!=expected) throw new AssertionError(name+": block="+(result!=null));
    if (name.equals("css") && view.scripts.size()!=1) throw new AssertionError("CSS not reached");
  }
}`;

let dir;
test.before(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'patagonia-java-'));
  const files = [];
  for (const [name, body] of Object.entries(stubs)) {
    const filename = path.join(dir, `${name.replaceAll('.', '/')}.java`);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, `package ${name.slice(0, name.lastIndexOf('.'))}; ${body}`);
    files.push(filename);
  }
  const filename = path.join(dir, 'RegressionTest.java');
  fs.writeFileSync(filename, harness);
  files.push(filename, ...fs.readdirSync(`${javaRoot}/content_blocker`).filter(n => n.endsWith('.java')).map(n => `${javaRoot}/content_blocker/${n}`));
  const compiled = spawnSync(java, ['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-d', dir, ...files], { encoding: 'utf8' });
  assert.equal(compiled.status, 0, compiled.stderr || compiled.error?.message);
});
test.after(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }); });

for (const scenario of ['domain', 'resource', 'unlessDomain', 'loadType', 'ifTopUrl', 'unlessTopUrl', 'lookalike', 'media', 'css']) {
  test(`native Android rule evaluation: ${scenario}`, () => {
    const result = spawnSync(java, ['-cp', dir, `${packageName}.content_blocker.RegressionTest`, scenario], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
}
