import ExpoModulesCore
import Foundation

public class FormeNativeModule: Module {
  private let queue = DispatchQueue(label: "me.rxresu.forme-native", qos: .userInitiated)

  public func definition() -> ModuleDefinition {
    Name("FormeNative")
    AsyncFunction("renderWithLayout") { (json: String) -> [String: Any] in
      let bytes = Data(json.utf8)
      let pointer = bytes.withUnsafeBytes { buffer in
        forme_render_with_layout(buffer.baseAddress?.assumingMemoryBound(to: UInt8.self), bytes.count)
      }
      guard let pointer else { throw FormeNativeError("Native result allocation failed") }
      defer { forme_result_free(pointer) }
      let result = pointer.pointee
      try self.check(result)
      return ["pdf": self.copy(result.pdf), "layout": String(decoding: self.copy(result.layout), as: UTF8.self),
              "warnings": String(decoding: self.copy(result.warnings), as: UTF8.self)]
    }.runOnQueue(queue)

    AsyncFunction("subsetFont") { (font: Data, text: String) -> Data in
      let utf8 = Data(text.utf8)
      let pointer = font.withUnsafeBytes { fontBuffer in
        utf8.withUnsafeBytes { textBuffer in
          forme_subset_font(fontBuffer.baseAddress?.assumingMemoryBound(to: UInt8.self), font.count,
                            textBuffer.baseAddress?.assumingMemoryBound(to: UInt8.self), utf8.count)
        }
      }
      guard let pointer else { throw FormeNativeError("Native result allocation failed") }
      defer { forme_result_free(pointer) }
      try self.check(pointer.pointee)
      return self.copy(pointer.pointee.pdf)
    }.runOnQueue(queue)
  }

  private func copy(_ buffer: FormeBuffer) -> Data {
    guard let data = buffer.data, buffer.len > 0 else { return Data() }
    return Data(bytes: data, count: buffer.len)
  }

  private func check(_ result: FormeResult) throws {
    if result.error.len > 0 { throw FormeNativeError(String(decoding: copy(result.error), as: UTF8.self)) }
  }
}

private struct FormeNativeError: Error, LocalizedError {
  let errorDescription: String?
  init(_ message: String) { errorDescription = message }
}
