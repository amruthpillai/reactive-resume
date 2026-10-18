module.exports = {
	// Native projects are generated; reviewed sources and pins define compatibility, not local build output.
	ignorePaths: [
		"ios",
		"android",
		"../../packages/forme-native/ios/FormeNative.xcframework/**",
		"../../packages/forme-native/ios/include/forme_native.h",
		"../../packages/forme-native/android/src/main/jniLibs/**",
		"../../packages/forme-native/rust/target/**",
	],
	extraSources: [
		{ type: "dir", filePath: "../../packages/forme-native/rust", reasons: ["Forme native engine"] },
		{
			type: "file",
			filePath: "../../packages/forme-native/scripts/prebuilt.json",
			reasons: ["Reviewed Forme native binary pin"],
		},
	],
};
