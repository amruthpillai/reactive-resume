fn main() {
    let include = std::env::var("DEP_HARFBUZZ_INCLUDE").expect("bundled HarfBuzz include path");
    let mut build = cc::Build::new();
    build
        .cpp(true)
        .std("c++11")
        .warnings(false)
        .include(&include);
    for file in [
        "hb-subset.cc",
        "hb-subset-input.cc",
        "hb-subset-plan.cc",
        "hb-subset-cff-common.cc",
        "hb-subset-cff1.cc",
        "hb-subset-cff2.cc",
        "hb-subset-instancer-iup.cc",
        "hb-subset-instancer-solver.cc",
        "hb-subset-repacker.cc",
        "graph/gsubgpos-context.cc",
    ] {
        build.file(std::path::Path::new(&include).join(file));
    }
    build.define("HAVE_PTHREAD", "1").compile("harfbuzz_subset");
    println!("cargo:rerun-if-changed=build.rs");
}
