use lopdf::Document;
use regex::Regex;
use serde::Serialize;

// This struct will send the found items back to Next.js
#[derive(Serialize)]
pub struct ScanResult {
    pub category: String,
    pub value: String,
    pub page: u32,
}

pub fn scan_content(input: &[u8]) -> Vec<ScanResult> {
    let doc = Document::load_mem(input).expect("Failed to load PDF");
    let mut results = Vec::new();

    // 1. Define our Patterns (CNIC, Email, Phone)
    // Note: Patterns are specific to the Pakistani market/global standards
    let patterns = [
        ("CNIC", r"\d{5}-\d{7}-\d{1}"),
        ("Email", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
        ("Phone", r"(\+92|0|92)[0-9]{10}"),
    ];

    // 2. Iterate through pages
    for (page_num, page_id) in doc.get_pages() {
        // Extract text from the specific page
        if let Ok(text) = doc.get_page_content(page_id).and_then(|_| doc.extract_text(&[page_num])) {

            for (label, pattern) in patterns.iter() {
                let re = Regex::new(pattern).unwrap();
                for cap in re.find_iter(&text) {
                    results.push(ScanResult {
                        category: label.to_string(),
                        value: cap.as_str().to_string(),
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