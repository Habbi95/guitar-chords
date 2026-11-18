import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    static let background = UIColor(red: 18 / 255, green: 20 / 255, blue: 24 / 255, alpha: 1)

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let root = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
        config.setURLSchemeHandler(SchemeHandler(root: root), forURLScheme: SchemeHandler.scheme)
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default() // persistent: saved progressions survive restarts

        let web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.backgroundColor = Self.background
        web.scrollView.backgroundColor = Self.background
        web.scrollView.contentInsetAdjustmentBehavior = .never // let CSS env(safe-area-inset-*) handle the notch
        web.scrollView.bounces = false
        if #available(iOS 16.4, *) { web.isInspectable = true }
        web.load(URLRequest(url: URL(string: "app://localhost/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    /// WKWebView shows no JS dialogs by itself: without this, prompt() returns null.
    @MainActor
    final class Coordinator: NSObject, WKUIDelegate {
        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                     defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping (String?) -> Void) {
            let alert = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
            alert.addTextField { field in
                field.text = defaultText
                field.clearButtonMode = .whileEditing
                field.keyboardType = Double(defaultText ?? "") != nil ? .numberPad : .default
            }
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(alert.textFields?.first?.text) })
            present(alert, over: webView) { completionHandler(nil) }
        }

        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(alert, over: webView, orElse: completionHandler)
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
            alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
            present(alert, over: webView) { completionHandler(false) }
        }

        private func present(_ alert: UIAlertController, over view: UIView, orElse fallback: @escaping () -> Void) {
            guard var top = view.window?.rootViewController else { return fallback() }
            while let next = top.presentedViewController { top = next }
            top.present(alert, animated: true)
        }
    }
}
