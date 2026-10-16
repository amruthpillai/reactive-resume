cmake_minimum_required(VERSION 3.22.1)
project(formenative_jni)
add_library(forme_native SHARED IMPORTED)
# Rust cdylibs omit SONAME; link by name so APK dependencies contain no build-directory path.
set_target_properties(forme_native PROPERTIES IMPORTED_NO_SONAME TRUE IMPORTED_LOCATION "${CMAKE_CURRENT_SOURCE_DIR}/src/main/jniLibs/${ANDROID_ABI}/libforme_native.so")
add_library(formenative_jni SHARED src/main/cpp/bridge.cpp)
target_include_directories(formenative_jni PRIVATE ../ios/include)
target_link_libraries(formenative_jni forme_native)
