import ExpoModulesCore
import UIKit

private let keyCommandPressed = Notification.Name("ReactiveResumeKeyCommandPressed")

internal struct KeyCommandRecord: Record {
  @Field
  var id: String = ""

  @Field
  var input: String = ""

  @Field
  var shift: Bool = false

  @Field
  var title: String = ""
}

// Hardware keyboard shortcuts: ⌘-commands on the root view controller, so they are in the responder chain of every
// screen and modal. They show in the ⌘-hold overlay. A focused text field keeps its own ⌘Z / ⇧⌘Z.
public class KeyCommandsModule: Module {
  private var installed: [UIKeyCommand] = []
  private weak var host: UIViewController?
  private var observer: NSObjectProtocol?

  public func definition() -> ModuleDefinition {
    Name("KeyCommands")

    Events("onKeyCommand")

    OnCreate {
      self.observer = NotificationCenter.default.addObserver(
        forName: keyCommandPressed, object: nil, queue: .main
      ) { [weak self] notification in
        guard let id = notification.object as? String else { return }
        self?.sendEvent("onKeyCommand", ["id": id])
      }
    }

    OnDestroy {
      if let observer = self.observer { NotificationCenter.default.removeObserver(observer) }
      let installed = self.installed
      let host = self.host
      DispatchQueue.main.async { installed.forEach { host?.removeKeyCommand($0) } }
    }

    Function("setCommands") { (commands: [KeyCommandRecord]) in
      DispatchQueue.main.async { self.install(commands) }
    }
  }

  private func install(_ commands: [KeyCommandRecord]) {
    installed.forEach { host?.removeKeyCommand($0) }
    let root = UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow?.rootViewController }
      .first
    installed = commands.map { record in
      UIKeyCommand(
        title: record.title,
        action: #selector(UIViewController.rr_keyCommandPressed(_:)),
        input: record.input,
        modifierFlags: record.shift ? [.command, .shift] : [.command],
        propertyList: record.id
      )
    }
    installed.forEach { root?.addKeyCommand($0) }
    host = root
  }
}

private weak var firstResponder: UIResponder?

extension UIResponder {
  @objc fileprivate func rr_reportFirstResponder(_ sender: Any?) {
    firstResponder = self
  }
}

extension UIViewController {
  // Any view controller in the chain can receive the action; they all forward it to the module.
  @objc func rr_keyCommandPressed(_ sender: UIKeyCommand) {
    // ⌘Z / ⇧⌘Z in a focused text field undo the typing, not the document.
    if sender.input == "z" {
      firstResponder = nil
      UIApplication.shared.sendAction(#selector(UIResponder.rr_reportFirstResponder(_:)), to: nil, from: nil, for: nil)
      if let editor = firstResponder, editor is UITextInput {
        if let undo = editor.undoManager {
          sender.modifierFlags.contains(.shift) ? undo.redo() : undo.undo()
        }
        return
      }
    }
    NotificationCenter.default.post(name: keyCommandPressed, object: sender.propertyList as? String)
  }
}
