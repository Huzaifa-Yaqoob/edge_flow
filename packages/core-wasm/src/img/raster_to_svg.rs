use vtracer::{ColorImage, Config, convert};


pub fn vectorize_image(raw_data: &[u8], iterations: usize) -> String {
    // 1. Load the image from the JS byte array
    let img = image::load_from_memory(raw_data).expect("Failed to load image");
    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let color_img = ColorImage {
        pixels: rgba.into_raw(),
        width: width as usize,
        height: height as usize,
    };

    // 2. Setup vtracer configuration
    // You can expose these parameters to your UI sliders later!
    let config = Config {
        color_precision: 6,      // Higher = more colors
        filter_speckle: 4,       // Removes tiny "noise" dots
        corner_threshold: 60,    // How "sharp" corners should be
        hierarchical: vtracer::Hierarchical::Stacked,
        max_iterations: iterations,
        ..Default::default()
    };

    // 3. Run the engine
    // VTracer converts in-memory pixels to an in-memory SVG.
    let svg = convert(color_img, config).expect("Failed to vectorize image");

    svg.to_string()
}