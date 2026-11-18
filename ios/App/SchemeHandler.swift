import WebKit
import WebShellKit

/// Serves the bundled web app at app://localhost/ so ES modules load and localStorage has a stable origin.
final class SchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "app"
    let root: URL

    init(root: URL) { self.root = root }

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return task.didFailWithError(URLError(.badURL)) }
        guard let hit = WebFiles.resolve(url, root: root), let data = try? Data(contentsOf: hit.file) else {
            let notFound = HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: ["Content-Length": "0"])!
            task.didReceive(notFound)
            task.didFinish()
            return
        }
        let headers = ["Content-Type": hit.mime, "Content-Length": String(data.count), "Cache-Control": "no-cache"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
