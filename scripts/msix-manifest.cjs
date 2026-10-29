"use strict";

const fs = require("node:fs");
const path = require("node:path");

function msixVersion(packageVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(packageVersion)) {
    throw new Error("La version de package.json debe tener formato mayor.menor.parche.");
  }
  const partes = packageVersion.split(".").map(Number);
  if (partes.some(numero => !Number.isSafeInteger(numero) || numero > 65535)) {
    throw new Error("Cada componente de version MSIX debe estar entre 0 y 65535.");
  }
  // Microsoft Store reserva la cuarta parte de la version; debe ser cero.
  return partes.join(".") + ".0";
}

function escaparXml(valor) {
  return String(valor).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function manifiesto({ identityName, publisher, publisherDisplayName, packageVersion }) {
  // Name y Publisher deben coincidir EXACTAMENTE con Partner Center en la publicacion.
  if (typeof identityName !== "string" ||
      !/^[A-Za-z0-9][A-Za-z0-9.-]{1,48}[A-Za-z0-9]$/.test(identityName)) {
    throw new Error("Identity Name MSIX invalido (3-50 caracteres alfanumericos, punto o guion).");
  }
  if (typeof publisher !== "string" || !/^CN=.+/i.test(publisher) ||
      /[\r\n\u0000-\u001f]/.test(publisher)) {
    throw new Error("Publisher MSIX invalido. Copia el Publisher (CN=...) desde Partner Center.");
  }
  if (typeof publisherDisplayName !== "string" || !publisherDisplayName.trim() ||
      /[\r\n\u0000-\u001f]/.test(publisherDisplayName)) {
    throw new Error("Falta PublisherDisplayName.");
  }
  const identity = escaparXml(identityName);
  const publisherXml = escaparXml(publisher);
  const display = escaparXml(publisherDisplayName);
  const version = msixVersion(packageVersion);
  return `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap rescap">
  <Identity Name="${identity}" Publisher="${publisherXml}" Version="${version}" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>Patagonia Browser</DisplayName>
    <PublisherDisplayName>${display}</PublisherDisplayName>
    <Logo>MSIXAssets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources>
    <Resource Language="es-AR" />
    <Resource Language="en-US" />
  </Resources>
  <Applications>
    <Application Id="PatagoniaBrowser" Executable="Patagonia Browser.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="Patagonia Browser"
                          Description="Navegador de escritorio con bloqueo de anuncios y rastreadores."
                          BackgroundColor="transparent"
                          Square150x150Logo="MSIXAssets\\Square150x150Logo.png"
                          Square44x44Logo="MSIXAssets\\Square44x44Logo.png" />
    </Application>
  </Applications>
  <Capabilities>
    <rescap:Capability Name="runFullTrust" />
  </Capabilities>
</Package>
`;
}

if (require.main === module) {
  try {
    const [destino, identityName, publisher, publisherDisplayName] = process.argv.slice(2);
    if (!destino) throw new Error("Uso: node scripts/msix-manifest.cjs SALIDA NAME PUBLISHER NOMBRE_EDITOR");
    const paquete = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
    const xml = manifiesto({ identityName, publisher, publisherDisplayName, packageVersion: paquete.version });
    fs.writeFileSync(destino, xml, "utf8");
    console.log("Manifiesto MSIX generado: " + destino);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { msixVersion, escaparXml, manifiesto };
