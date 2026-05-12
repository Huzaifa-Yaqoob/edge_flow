use wasm_bindgen::prelude::*;
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;
use serde::Serialize;

#[derive(Serialize)]
pub struct ImageAsset {
    pub size_label: String,
    pub width: u32,
    pub data: Vec<u8>,
}

/// Private helper for internal optimization
fn optimize_to_webp_internal(img: &DynamicImage, target_width: u32, quality: f32) -> Vec<u8> {
    let scaled = img.resize(target_width, u32::MAX, image::imageops::FilterType::Lanczos3);

    let mut buffer = Vec::new();
    let mut cursor = Cursor::new(&mut buffer);

    // Use image crate's WebP encoder with quality
    let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut cursor);
    // For lossy with quality control:
    // let encoder = image::codecs::webp::WebPEncoder::new_with_quality(&mut cursor, quality);

    scaled.write_with_encoder(encoder).expect("Failed to encode WebP");
    buffer
}

/// Main entry point for the responsive tool
pub fn generate_responsive_bundle(raw_data: &[u8], quality: f32) -> Vec<ImageAsset> {
    let img = image::load_from_memory(raw_data).expect("Failed to load source image");
    let (orig_w, _) = (img.width(), img.height());

    let targets = vec![
        ("mobile", 640),
        ("tablet", 1024),
        ("desktop", orig_w),
    ];

    let mut bundle = Vec::new();
    for (label, target_w) in targets {
        let final_width = if orig_w > target_w { target_w } else { orig_w };
        let webp_data = optimize_to_webp_internal(&img, final_width, quality);

        bundle.push(ImageAsset {
            size_label: label.to_string(),
            width: final_width,
            data: webp_data,
        });
    }
    bundle
}

// --- TESTS SECTION ---
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_responsive_logic_and_encoding() {
        // 1. Create a 1200x800 test image (to trigger tablet and mobile breakpoints)
        let mut img_buffer = Vec::new();
        let test_img = image::DynamicImage::new_rgb8(1200, 800);
        test_img.write_to(&mut std::io::Cursor::new(&mut img_buffer), image::ImageFormat::Png).unwrap();

        // 2. Execute the bundle generation
        let bundle = generate_responsive_bundle(&img_buffer, 75.0);

        // 3. Verify counts
        assert_eq!(bundle.len(), 3, "Should have 3 assets");

        // 4. Verify specific breakpoint widths
        assert_eq!(bundle[0].width, 640, "Mobile should be 640px");
        assert_eq!(bundle[1].width, 1024, "Tablet should be 1024px");
        assert_eq!(bundle[2].width, 1200, "Desktop should remain 1200px");

        // 5. Verify WebP validity (Magic Numbers)
        for asset in bundle {
            assert!(!asset.data.is_empty(), "Data should not be empty");
            assert_eq!(&asset.data[0..4], b"RIFF", "Should start with RIFF");
            assert_eq!(&asset.data[8..12], b"WEBP", "Should contain WEBP header");
        }
    }
}