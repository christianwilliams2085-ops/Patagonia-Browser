import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val previewBuild = System.getenv("PATAGONIA_PREVIEW") == "1"
val signingProperties = Properties()
val signingFile = rootProject.file("key.properties")
if (signingFile.exists()) {
    signingFile.inputStream().use { signingProperties.load(it) }
}

android {
    namespace = "com.patagoniabrowser.patagonia_browser"
    // GeckoView 159 pide compilar contra Android 37.2.
    compileSdk {
        version = release(37) { minorApiLevel = 2 }
    }
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.patagoniabrowser.patagonia_browser"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        // GeckoView necesita Android 8.0 (API 26) como mínimo.
        minSdk = 26
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["appLabel"] = if (previewBuild) "Patagonia Pruebas" else "Patagonia Browser"
        if (previewBuild) {
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-prueba"
        }
    }

    signingConfigs {
        if (signingFile.exists() && !previewBuild) {
            create("patagoniaRelease") {
                storeFile = rootProject.file(requireNotNull(signingProperties.getProperty("storeFile")))
                storePassword = signingProperties.getProperty("storePassword")
                keyAlias = signingProperties.getProperty("keyAlias")
                keyPassword = signingProperties.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // Preview installs separately. Official updates use the original
            // local key, or remain unsigned for the existing external signer.
            if (previewBuild) {
                signingConfig = signingConfigs.getByName("debug")
            } else if (signingFile.exists()) {
                signingConfig = signingConfigs.getByName("patagoniaRelease")
            }
        }
    }

    packaging {
        // Comprime las bibliotecas nativas (libxul.so de GeckoView) dentro del APK.
        jniLibs {
            useLegacyPackaging = true
            // Todos los celulares de la familia son de 64 bits: solo arm64. GeckoView pesa
            // ~65 MB por arquitectura y Flutter ignora ndk.abiFilters, por eso se excluye acá.
            excludes += listOf("lib/armeabi-v7a/**", "lib/x86_64/**", "lib/x86/**")
        }
    }

    androidResources {
        // El .xpi de uBlock Origin ya es un zip: se guarda tal cual.
        noCompress += "xpi"
    }
}

dependencies {
    implementation("org.mozilla.geckoview:geckoview:159.0.20261022150525")
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
