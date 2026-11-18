import Foundation

/// Maps app://localhost/<path> requests to files bundled with the app.
public enum WebFiles {
    public static func mimeType(forExtension ext: String) -> String { "" }
    public static func resolve(_ url: URL, root: URL) -> (file: URL, mime: String)? { nil }
}
