mod pdf;

use wasm_bindgen::prelude::*;
use serde::Serialize;

#[wasm_bindgen(typescript_custom_section)]
const TS_APPEND_CONTENT: &'static str = r#"
export interface ScanResult {
    category: string;
    value: string;
    page: number;
}

export interface ProcessedResponse {
    pdf_data: Uint8Array;
    findings: ScanResult[];
}
"#;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub fn process_status() -> String {
    "Rust Engine is Active".to_string()
}

#[wasm_bindgen]
pub fn sanitize_pdf(file_bits: &[u8]) -> Vec<u8> {
    // Call the logic hidden in the pdf module
    pdf::scrubber::run_sanitization(file_bits)
}



// 2. The JS-facing wrapper
#[wasm_bindgen(typescript_type = "ScanResult")]
pub fn get_sensitive_data(file_bits: &[u8]) -> Result<JsValue, JsValue> {
    let results = pdf::scanner::scan_content(file_bits);


    Ok(serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsValue::from_str(&e.to_string()))?)
}



#[derive(Serialize)]
struct ProcessedResponse {
    pdf_data: Vec<u8>,
    findings: Vec<pdf::scanner::ScanResult>,
}



#[wasm_bindgen(typescript_type = "ProcessedResponse")]
pub fn initial_sanitize_and_get_sensitive_data(file_bits: &[u8]) -> Result<JsValue, JsValue> {
    // 1. Scrub the PDF (returns Vec<u8>)
    let sanitized_pdf = pdf::scrubber::run_sanitization(file_bits);

    // 2. Scan the sanitized version
    let results = pdf::scanner::scan_content(&sanitized_pdf);

    // 3. Package BOTH into our response struct

    let response = ProcessedResponse {
        pdf_data: sanitized_pdf,
        findings: results,
    };

    // 4. Convert the whole package to a JS Object

    pub fn get_type_hint() {}
    Ok(serde_wasm_bindgen::to_value(&response)
        .map_err(|e| JsValue::from_str(&e.to_string()))?)
}