require "tmpdir"

# Exercise the real build lane while replacing only Gradle and the Fastlane DSL.
class AndroidBuildContract
  attr_reader :gradle_options, :keystore_path

  def initialize
    @lanes = {}
    instance_eval(File.read(File.join(__dir__, "fastlane/Fastfile")), File.join(__dir__, "fastlane/Fastfile"))
  end

  def desc(_description); end

  def platform(name)
    @platform = name
    yield
  end

  def lane(name, &block)
    @lanes[[@platform, name]] = block
  end

  def build(options = {})
    instance_exec(options, &@lanes.fetch([:android, :build]))
  end

  def gradle(**options)
    @gradle_options = options
    @keystore_path = options.fetch(:properties).fetch("android.injected.signing.store.file")
    raise "Missing keystore" unless File.binread(@keystore_path) == "fixture"
    raise "Keystore permissions" unless File.stat(@keystore_path).mode & 0777 == 0600
    File.write(File.join(ENV.fetch("RUNNER_TEMP"), "fixture.apk"), "signed APK")
    File.write(File.join(ENV.fetch("RUNNER_TEMP"), "fixture.aab"), "signed AAB")
  end

  def lane_context
    {
      SharedValues::GRADLE_APK_OUTPUT_PATH => File.join(ENV.fetch("RUNNER_TEMP"), "fixture.apk"),
      SharedValues::GRADLE_AAB_OUTPUT_PATH => File.join(ENV.fetch("RUNNER_TEMP"), "fixture.aab")
    }
  end
end

module SharedValues
  GRADLE_APK_OUTPUT_PATH = :apk
  GRADLE_AAB_OUTPUT_PATH = :aab
end

module UI
  def self.user_error!(message)
    raise message
  end
end

Dir.mktmpdir do |directory|
  ENV.update(
    "RUNNER_TEMP" => directory,
    "ANDROID_KEYSTORE_BASE64" => "Zml4dHVyZQ==",
    "ANDROID_KEYSTORE_PASSWORD" => "fixture-store",
    "ANDROID_KEY_ALIAS" => "fixture-alias",
    "ANDROID_KEY_PASSWORD" => "fixture-key"
  )
  contract = AndroidBuildContract.new
  [nil, "arm64-v8a", "armeabi-v7a", "x86_64"].each do |abi|
    contract.build(abi ? { abi: abi } : {})
    options = contract.gradle_options
    raise "Wrong Gradle task" unless options[:task] == (abi ? "assemble" : "bundle")
    raise "Wrong ABI filter" unless options[:properties]["reactNativeArchitectures"] == abi
    raise "Signing command exposed" unless options[:print_command] == false
    raise "Keystore leaked" if File.exist?(contract.keystore_path)
    name = abi ? "reactive-resume-#{abi}.apk" : "ReactiveResume.aab"
    expected = abi ? "signed APK" : "signed AAB"
    raise "Wrong artifact" unless File.read(File.join(directory, "mobile-release", name)) == expected
  end
  begin
    contract.build(abi: "invalid")
    raise "Invalid ABI accepted"
  rescue RuntimeError => error
    raise unless error.message == "Unsupported Android ABI"
  end
end

puts "Android build contract passed: store AAB, three nightly APK ABIs, signing cleanup, invalid ABI rejection."
