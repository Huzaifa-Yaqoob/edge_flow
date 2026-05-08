use::lopdf::{Document};

pub fn run_sanitization(input: &[u8]) -> Vec<u8> {
    // 1. Load the document
    let mut doc = Document::load_mem(input).expect("Failed to load PDF");

    // 2. Remove Legacy Metadata (Info Dictionary)
    doc.trailer.remove(b"Info");

    // 3. Remove Modern Metadata (XMP Stream)
    // We break this into two simple steps to avoid Result/Option mismatches
    if let Ok(catalog) = doc.catalog_mut() {
        catalog.remove(b"Metadata");
        catalog.remove(b"PieceInfo"); // Removes App-specific private data
        catalog.remove(b"OCProperties"); // Removes optional content (hidden layers)
    }

    doc.prune_objects();

    // 4. Force a structural rebuild
    // This recalculates the XREF table, making the file "clean" and linear.
    doc.renumber_objects();


    // 4. Save the cleaned version
    let mut buffer = Vec::new();
    doc.save_to(&mut buffer).unwrap();
    buffer
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_pdf_sanitization() {
        // 1. Read a real PDF file from your system for testing
        // Put a sample.pdf in your packages/core-wasm folder
        let input_data = fs::read("test_assets/sample.pdf").expect("Could not read test PDF");

        // 2. Run your function
        let output_data = run_sanitization(&input_data);

        // 3. Verify it's not empty
        assert!(!output_data.is_empty());

        // 4. Save the result to check it manually
        fs::write("sanitized_output.pdf", output_data).expect("Could not write output");

        println!("Sanitization complete! Check sanitized_output.pdf");
    }
}