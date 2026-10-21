"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { msixVersion, escaparXml, manifiesto } = require("../scripts/msix-manifest.cjs");

const datos = {
  identityName: "PatagoniaBrowser.Test",
  publisher: "CN=Patagonia Browser Test",
  publisherDisplayName: "Patagonia Browser Test",
  packageVersion: "1.0.4"
};

test("la version MSIX reserva el cuarto componente para Microsoft Store", () => {
  assert.equal(msixVersion("1.0.4"), "1.0.4.0");
  assert.throws(() => msixVersion("1.0.4-beta"));
  assert.throws(() => msixVersion("1.0.65536"));
  assert.throws(() => msixVersion("1.0.4.1"));
});

test("el manifest incluye arquitectura, aplicacion full trust y logos", () => {
  const xml = manifiesto(datos);
  assert.match(xml, /ProcessorArchitecture="x64"/);
  assert.match(xml, /Version="1\.0\.4\.0"/);
  assert.match(xml, /Executable="Patagonia Browser\.exe"/);
  assert.match(xml, /EntryPoint="Windows\.FullTrustApplication"/);
  assert.match(xml, /Capability Name="runFullTrust"/);
  assert.match(xml, /Square150x150Logo="MSIXAssets\\Square150x150Logo\.png"/);
  assert.match(xml, /Square44x44Logo="MSIXAssets\\Square44x44Logo\.png"/);
});

test("el manifest escapa datos XML provistos por Partner Center", () => {
  assert.equal(escaparXml('a&"<b>'), "a&amp;&quot;&lt;b&gt;");
  const xml = manifiesto({ ...datos, publisherDisplayName: 'Editor & "Patagonia"' });
  assert.match(xml, /Editor &amp; &quot;Patagonia&quot;/);
});

test("se rechazan identidades incompletas o peligrosas", () => {
  assert.throws(() => manifiesto({ ...datos, identityName: "" }));
  assert.throws(() => manifiesto({ ...datos, identityName: "../otro" }));
  assert.throws(() => manifiesto({ ...datos, publisher: "otro editor" }));
  assert.throws(() => manifiesto({ ...datos, publisher: "CN=editor\nOtro" }));
  assert.throws(() => manifiesto({ ...datos, publisherDisplayName: "" }));
});
