import XCTest
@testable import WebShellKit

final class WebFilesTests: XCTestCase {
    let root = URL(fileURLWithPath: "/bundle/web", isDirectory: true)
    func resolve(_ s: String) -> (file: URL, mime: String)? { WebFiles.resolve(URL(string: s)!, root: root) }

    func testMimeTypes() {
        XCTAssertEqual(WebFiles.mimeType(forExtension: "html"), "text/html")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "js"), "text/javascript")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "css"), "text/css")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "png"), "image/png")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "webmanifest"), "application/manifest+json")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "JS"), "text/javascript")
        XCTAssertEqual(WebFiles.mimeType(forExtension: "weird"), "application/octet-stream")
    }

    func testRootServesIndex() {
        XCTAssertEqual(resolve("app://localhost/")?.file.path, "/bundle/web/index.html")
        XCTAssertEqual(resolve("app://localhost")?.file.path, "/bundle/web/index.html")
        XCTAssertEqual(resolve("app://localhost/")?.mime, "text/html")
    }

    func testNestedFile() {
        let r = resolve("app://localhost/js/theory/chord.js")
        XCTAssertEqual(r?.file.path, "/bundle/web/js/theory/chord.js")
        XCTAssertEqual(r?.mime, "text/javascript")
    }

    func testQueryIgnored() {
        XCTAssertEqual(resolve("app://localhost/css/app.css?v=2")?.file.path, "/bundle/web/css/app.css")
    }

    func testTraversalRefused() {
        XCTAssertNil(resolve("app://localhost/../secret"))
        XCTAssertNil(resolve("app://localhost/js/../../x"))
        XCTAssertNil(resolve("app://localhost/%2e%2e/secret"))
        XCTAssertNil(resolve("app://localhost/js/%2E%2E/%2e%2e/x"))
    }

    func testInnerDotDotThatStaysInsideIsAllowed() {
        XCTAssertEqual(resolve("app://localhost/js/../index.html")?.file.path, "/bundle/web/index.html")
    }
}
