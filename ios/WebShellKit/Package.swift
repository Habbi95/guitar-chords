// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "WebShellKit",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [.library(name: "WebShellKit", targets: ["WebShellKit"])],
    targets: [
        .target(name: "WebShellKit"),
        .testTarget(name: "WebShellKitTests", dependencies: ["WebShellKit"]),
    ]
)
