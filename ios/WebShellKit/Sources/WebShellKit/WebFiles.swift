import Foundation

/// Maps app://localhost/<path> requests to files bundled with the app.
public enum WebFiles {
    static let types: [String: String] = [
        "html": "text/html", "js": "text/javascript", "mjs": "text/javascript", "css": "text/css",
        "json": "application/json", "webmanifest": "application/manifest+json",
        "png": "image/png", "svg": "image/svg+xml", "ico": "image/x-icon", "txt": "text/plain",
    ]

    public static func mimeType(forExtension ext: String) -> String {
        types[ext.lowercased()] ?? "application/octet-stream"
    }

    /// The bundled file for a request, or nil if the path would leave `root`.
    public static func resolve(_ url: URL, root: URL) -> (file: URL, mime: String)? {
        // `path` is already percent-decoded, so "%2e%2e" arrives as "..".
        var stack: [String] = []
        for segment in url.path.split(separator: "/", omittingEmptySubsequences: true) {
            switch segment {
            case ".": continue
            case "..":
                if stack.isEmpty { return nil }
                stack.removeLast()
            default: stack.append(String(segment))
            }
        }
        if stack.isEmpty { stack = ["index.html"] }
        let file = stack.reduce(root) { $0.appendingPathComponent($1) }
        return (file, mimeType(forExtension: file.pathExtension))
    }
}
