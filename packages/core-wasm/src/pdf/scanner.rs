use lopdf::{Document, content::Operation};
use regex::Regex;
use serde::Serialize;

#[derive(Serialize)]
pub struct ScanResult {
    pub category: String,
    pub value: String,
    pub page: u32,
}
pub fn scan_content(input: &[u8]) -> Vec<ScanResult> {
    let doc = Document::load_mem(input).expect("Failed to load PDF");
    let mut results = Vec::new();

    let patterns = [
        ("CNIC", r"\d{5}-\d{7}-\d{1}"),
        ("Email", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    ];

    for (page_num, _) in doc.get_pages() {
        // Use the high-level extractor that handles encoding automatically
        if let Ok(text) = doc.extract_text(&[page_num]) {
            for (label, pattern) in patterns.iter() {
                let re = Regex::new(pattern).unwrap();
                for mat in re.find_iter(&text) {
                    results.push(ScanResult {
                        category: label.to_string(),
                        value: mat.as_str().to_string(),
                        page: page_num,
                    });
                }
            }
        }
    }
    results
}


#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_content_scanner() {
        // 1. Read your test PDF
        // Ensure you have a 'sample.pdf' in the root of core-wasm
        // that contains an email or a CNIC (e.g., 42101-1234567-1)
        let input_data = fs::read("test_assets/sample.pdf").expect("Could not read sample.pdf");

        // 2. Run the scanner
        let results = scan_content(&input_data);

        // 3. Print the results to the console
        println!("\n--- Scan Results ---");
        if results.is_empty() {
            println!("No sensitive data found.");
        } else {
            for item in results {
                println!("[{}] Found: {} on Page {}", item.category, item.value, item.page);
            }
        }
        println!("--------------------\n");
    }
}