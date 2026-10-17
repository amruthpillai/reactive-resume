Pod::Spec.new do |s|
  s.name = 'KeyCommands'
  s.version = '0.0.0'
  s.summary = 'Hardware keyboard shortcuts'
  s.description = s.summary
  s.license = 'MIT'
  s.author = 'Reactive Resume'
  s.homepage = 'https://github.com/reactive-resume/reactive-resume'
  s.platforms = { :ios => '17.4' }
  s.source = { :git => 'https://github.com/reactive-resume/reactive-resume.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.swift'
  s.frameworks = 'UIKit'
end
