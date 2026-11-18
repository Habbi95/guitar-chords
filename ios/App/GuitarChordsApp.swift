import AVFoundation
import SwiftUI

@main
struct GuitarChordsApp: App {
    @Environment(\.scenePhase) private var phase

    init() {
        // .playback: keep sound on with the silent switch on.
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    var body: some Scene {
        WindowGroup {
            WebView()
                .ignoresSafeArea()
                .background(Color(red: 18 / 255, green: 20 / 255, blue: 24 / 255))
                .preferredColorScheme(.dark)
        }
        .onChange(of: phase, initial: true) { _, now in
            // Never auto-lock while the app is in front: you're playing guitar, not touching the screen.
            UIApplication.shared.isIdleTimerDisabled = (now == .active)
        }
    }
}
