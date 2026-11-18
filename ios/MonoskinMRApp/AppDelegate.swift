import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    excludeAppDataFromBackup()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "MonoskinMRApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// MOB-04 — keep this app's data out of iCloud and encrypted device backups.
  ///
  /// Android disables system backup outright via `android:allowBackup="false"`.
  /// iOS has no equivalent switch: every app is opted in, and exclusion has to be
  /// requested per file or per directory. Without it, everything the app stores —
  /// queued lead records with doctor names, phone numbers, GST and drug-licence
  /// numbers, plus every brochure and product video a representative downloads —
  /// was swept into that person's personal iCloud account at the next backup, and
  /// stayed restorable onto any device signed into that Apple ID after they left.
  ///
  /// Marking the two container directories is what covers it:
  ///   • Documents         — downloaded brochures and videos (still visible in the
  ///                         Files app and still shareable; backup exclusion and
  ///                         file sharing are independent flags).
  ///   • Application Support — where AsyncStorage keeps its store.
  ///
  /// The flag applies to a directory's whole subtree, including files created
  /// later, so this runs once at launch and needs no per-download bookkeeping.
  ///
  /// Correct under Apple's own guidance: the ERP is the system of record, so
  /// nothing here is irreplaceable user-generated content that a backup must
  /// preserve. Every step is `try?` — a failure to set an optimisation flag must
  /// never stop the app from launching.
  private func excludeAppDataFromBackup() {
    let fileManager = FileManager.default
    let directories: [FileManager.SearchPathDirectory] = [
      .documentDirectory,
      .applicationSupportDirectory,
    ]

    for directory in directories {
      guard var url = fileManager.urls(for: directory, in: .userDomainMask).first else {
        continue
      }

      // Application Support does not exist until something writes to it, and the
      // resource value cannot be set on a path that is not there yet.
      if !fileManager.fileExists(atPath: url.path) {
        try? fileManager.createDirectory(at: url, withIntermediateDirectories: true)
      }

      var values = URLResourceValues()
      values.isExcludedFromBackup = true
      try? url.setResourceValues(values)
    }
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
