use lopdf::{Document, Object, ObjectId};
use lopdf::content::{Content, Operation};

#[derive(serde::Deserialize)]
pub struct RedactionItem {
    pub page: u32,
    #[serde(rename = "xPct")]
    pub x_pct: f64,
    #[serde(rename = "yPct")]
    pub y_pct: f64,
    #[serde(rename = "widthPct")]
    pub width_pct: f64,
    #[serde(rename = "heightPct")]
    pub height_pct: f64,
    pub quote: String,
}


// ── 2-D affine matrix [a b c d e f] ────────────────────────────────────────
type Mat = [f64; 6];

fn identity() -> Mat { [1.0, 0.0, 0.0, 1.0, 0.0, 0.0] }

fn concat(m1: Mat, m2: Mat) -> Mat {
    let [a1, b1, c1, d1, e1, f1] = m1;
    let [a2, b2, c2, d2, e2, f2] = m2;
    [
        a1*a2 + c1*b2,
        b1*a2 + d1*b2,
        a1*c2 + c1*d2,
        b1*c2 + d1*d2,
        a1*e2 + c1*f2 + e1,
        b1*e2 + d1*f2 + f1,
    ]
}

fn invert(m: Mat) -> Mat {
    let [a, b, c, d, e, f] = m;
    let det = a*d - b*c;
    if det.abs() < 1e-10 { return identity(); }
    [d/det, -b/det, -c/det, a/det, (c*f-d*e)/det, (b*e-a*f)/det]
}

fn transform_pt(m: Mat, x: f64, y: f64) -> (f64, f64) {
    let [a, b, c, d, e, f] = m;
    (a*x + c*y + e, b*x + d*y + f)
}

// Transform an axis-aligned rect through a matrix and return a new AABB.
fn transform_rect(m: Mat, r: (f64,f64,f64,f64)) -> (f64,f64,f64,f64) {
    let (x1,y1,x2,y2) = r;
    let pts = [
        transform_pt(m,x1,y1), transform_pt(m,x1,y2),
        transform_pt(m,x2,y1), transform_pt(m,x2,y2),
    ];
    let min_x = pts.iter().map(|(x,_)| *x).fold(f64::INFINITY,  f64::min);
    let min_y = pts.iter().map(|(_,y)| *y).fold(f64::INFINITY,  f64::min);
    let max_x = pts.iter().map(|(x,_)| *x).fold(f64::NEG_INFINITY, f64::max);
    let max_y = pts.iter().map(|(_,y)| *y).fold(f64::NEG_INFINITY, f64::max);
    (min_x, min_y, max_x, max_y)
}

// ── Utility ─────────────────────────────────────────────────────────────────
fn obj_to_f64(obj: &Object) -> Option<f64> {
    obj.as_float().ok().map(|v| v as f64)
        .or_else(|| obj.as_i64().ok().map(|v| v as f64))
}

fn replace_all_subs(input: &[u8], needle: &[u8], replacement: &[u8]) -> Vec<u8> {
    if needle.is_empty() { return input.to_vec(); }
    let mut out = Vec::with_capacity(input.len());
    let mut i = 0usize;
    while i < input.len() {
        if i + needle.len() <= input.len() && &input[i..i+needle.len()] == needle {
            out.extend_from_slice(replacement);
            i += needle.len();
        } else {
            out.push(input[i]);
            i += 1;
        }
    }
    out
}

fn decode_pdf_string(bytes: &[u8]) -> Option<String> {
    if let Ok(s) = std::str::from_utf8(bytes) { return Some(s.to_string()); }
    if bytes.len() >= 2 && bytes.len() % 2 == 0 {
        let has_bom = bytes[0] == 0xFE && bytes[1] == 0xFF;
        let body = if has_bom { &bytes[2..] } else { bytes };
        if body.len() % 2 == 0 {
            let u16s: Vec<u16> = body.chunks_exact(2)
                .map(|c| u16::from_be_bytes([c[0],c[1]])).collect();
            if let Ok(s) = String::from_utf16(&u16s) { return Some(s); }
        }
    }
    None
}

fn char_count_from_pdf_string(bytes: &[u8]) -> usize {
    decode_pdf_string(bytes).map(|s| s.chars().count()).unwrap_or(bytes.len())
}

fn mask_pdf_string(bytes: &mut Vec<u8>) {
    let n = char_count_from_pdf_string(bytes);
    if std::str::from_utf8(bytes).is_ok() {
        *bytes = "*".repeat(n).into_bytes();
        return;
    }
    if bytes.len() >= 2 && bytes.len() % 2 == 0 {
        let has_bom = bytes[0] == 0xFE && bytes[1] == 0xFF;
        let mut out = Vec::new();
        if has_bom { out.extend_from_slice(&[0xFE,0xFF]); }
        for unit in "*".repeat(n).encode_utf16() { out.extend_from_slice(&unit.to_be_bytes()); }
        *bytes = out;
        return;
    }
    *bytes = vec![b'*'; n];
}

fn intersects(a: (f64,f64,f64,f64), b: (f64,f64,f64,f64)) -> bool {
    let (ax1,ay1,ax2,ay2) = a;
    let (bx1,by1,bx2,by2) = b;
    ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1
}

fn text_bbox(x: f64, y: f64, n: usize, fs: f64, hs: f64) -> (f64,f64,f64,f64) {
    let w = (n as f64) * fs * 0.6 * (hs/100.0);
    (x, y - fs, x + w.max(0.0), y)
}

fn string_matches_quote(bytes: &[u8], quote: &str) -> bool {
    if quote.is_empty() { return false; }
    if let Some(text) = decode_pdf_string(bytes) {
        let t = text.trim();
        let q = quote.trim();
        t.chars().count() >= 4 && (q.contains(t) || t.contains(q))
    } else { false }
}

// ── Core: redact text operations in a parsed Content ────────────────────────
// Returns true if anything was changed.
fn redact_content_ops(
    ops: &mut Vec<Operation>,
    redact_rect: (f64,f64,f64,f64),
    quote: &str,
) -> bool {
    let mut changed = false;
    let mut in_text = false;
    let mut tx = 0.0f64; let mut ty = 0.0f64;
    let mut lx = 0.0f64; let mut ly = 0.0f64;
    let mut leading = 0.0f64;
    let mut fs = 12.0f64;
    let mut hs = 100.0f64;

    for op in ops.iter_mut() {
        match op.operator.as_str() {
            "BT" => { in_text = true;  tx=0.0; ty=0.0; lx=0.0; ly=0.0; }
            "ET" => { in_text = false; }
            "Tm" => {
                if op.operands.len() >= 6 {
                    if let (Some(nx), Some(ny)) =
                        (obj_to_f64(&op.operands[4]), obj_to_f64(&op.operands[5]))
                    { tx=nx; ty=ny; lx=nx; ly=ny; }
                }
            }
            "Td" => {
                if op.operands.len() >= 2 {
                    if let (Some(dx), Some(dy)) =
                        (obj_to_f64(&op.operands[0]), obj_to_f64(&op.operands[1]))
                    { lx+=dx; ly+=dy; tx=lx; ty=ly; }
                }
            }
            "TD" => {
                if op.operands.len() >= 2 {
                    if let (Some(dx), Some(dy)) =
                        (obj_to_f64(&op.operands[0]), obj_to_f64(&op.operands[1]))
                    { lx+=dx; ly+=dy; tx=lx; ty=ly; leading=-dy; }
                }
            }
            "T*" => { ly-=leading; tx=lx; ty=ly; }
            "Tf" => {
                if op.operands.len() >= 2 {
                    if let Some(sz) = obj_to_f64(&op.operands[1]) { fs = sz.abs().max(1.0); }
                }
            }
            "Tz" => {
                if let Some(sc) = op.operands.first().and_then(obj_to_f64) { hs = sc; }
            }
            "Tj" | "'" | "\"" => {
                if !in_text { continue; }
                if let Some(Object::String(bytes, _)) = op.operands.get_mut(0) {
                    let n = char_count_from_pdf_string(bytes);
                    let bbox = text_bbox(tx, ty, n, fs, hs);
                    if intersects(bbox, redact_rect) || string_matches_quote(bytes, quote) {
                        mask_pdf_string(bytes);
                        changed = true;
                    }
                    tx = bbox.2;
                }
            }
            "TJ" => {
                if !in_text { continue; }
                if let Some(Object::Array(parts)) = op.operands.get_mut(0) {
                    for part in parts.iter_mut() {
                        match part {
                            Object::String(bytes, _) => {
                                let n = char_count_from_pdf_string(bytes);
                                let bbox = text_bbox(tx, ty, n, fs, hs);
                                if intersects(bbox, redact_rect) || string_matches_quote(bytes, quote) {
                                    mask_pdf_string(bytes);
                                    changed = true;
                                }
                                tx = bbox.2;
                            }
                            Object::Integer(adj) => { tx -= (*adj as f64/1000.0)*fs*(hs/100.0); }
                            Object::Real(adj)    => { tx -= (*adj as f64/1000.0)*fs*(hs/100.0); }
                            _ => {}
                        }
                    }
                }
            }
            _ => {}
        }
    }
    changed
}

// ── Process a single stream, applying text redaction ────────────────────────
// Returns Some(new_bytes) if anything was changed.
fn redact_stream_bytes(
    plain: &[u8],
    redact_rect: (f64,f64,f64,f64),
    quote: &str,
) -> Option<Vec<u8>> {
    let mut content = Content::decode(plain).ok()?;
    if redact_content_ops(&mut content.operations, redact_rect, quote) {
        content.encode().ok()
    } else {
        None
    }
}

// ── Collect (XObject-name, CTM-at-Do) from the page content ─────────────────
// We also apply redaction to the page content itself and return the new bytes.
fn process_page_content(
    doc: &Document,
    page_id: ObjectId,
    redact_rect: (f64,f64,f64,f64),
    quote: &str,
) -> (Vec<u8>, Vec<(String, Mat)>) {
    let encoded = doc.get_page_content(page_id).expect("get_page_content");
    let mut content = Content::decode(&encoded).expect("decode page content");

    // Track CTM (simplified: single matrix, no full q/Q stack needed for coord transform)
    let mut ctm_stack: Vec<Mat> = vec![identity()];
    let mut do_calls: Vec<(String, Mat)> = Vec::new();

    // First pass: collect Do calls and their CTMs, redact text in the page stream itself.
    for op in &mut content.operations {
        match op.operator.as_str() {
            "q" => {
                let top = *ctm_stack.last().unwrap_or(&identity());
                ctm_stack.push(top);
            }
            "Q" => { if ctm_stack.len() > 1 { ctm_stack.pop(); } }
            "cm" => {
                if op.operands.len() >= 6 {
                    let m = [
                        obj_to_f64(&op.operands[0]).unwrap_or(1.0),
                        obj_to_f64(&op.operands[1]).unwrap_or(0.0),
                        obj_to_f64(&op.operands[2]).unwrap_or(0.0),
                        obj_to_f64(&op.operands[3]).unwrap_or(1.0),
                        obj_to_f64(&op.operands[4]).unwrap_or(0.0),
                        obj_to_f64(&op.operands[5]).unwrap_or(0.0),
                    ];
                    let top = ctm_stack.last_mut().unwrap();
                    *top = concat(*top, m);
                }
            }
            "Do" => {
                if let Some(Object::Name(name_bytes)) = op.operands.first() {
                    if let Ok(name) = std::str::from_utf8(name_bytes) {
                        let ctm = *ctm_stack.last().unwrap_or(&identity());
                        do_calls.push((name.to_string(), ctm));
                    }
                }
            }
            _ => {}
        }
    }

    // Redact text directly in the page content stream (handles simple/non-XObject PDFs).
    redact_content_ops(&mut content.operations, redact_rect, quote);

    let new_bytes = content.encode().expect("encode page content");
    (new_bytes, do_calls)
}

// ── Look up an XObject ObjectId from the page's resource dictionary ─────────
fn resolve_xobject(doc: &Document, page_id: ObjectId, name: &str) -> Option<ObjectId> {
    let page_dict = doc.get_dictionary(page_id).ok()?;

    // /Resources may be a direct dict or a reference
    let res_id: Option<ObjectId> = page_dict.get(b"Resources").ok()
        .and_then(|r| r.as_reference().ok());

    let xobj_id: Option<ObjectId> = if let Some(rid) = res_id {
        let rd = doc.get_dictionary(rid).ok()?;
        rd.get(b"XObject").ok()?.as_dict().ok()?
            .get(name.as_bytes()).ok()?.as_reference().ok()
    } else {
        page_dict.get(b"Resources").ok()?.as_dict().ok()?
            .get(b"XObject").ok()?.as_dict().ok()?
            .get(name.as_bytes()).ok()?.as_reference().ok()
    };
    xobj_id
}

// ── Process each form XObject found in the page content ─────────────────────
fn process_xobjects(
    doc: &mut Document,
    page_id: ObjectId,
    do_calls: Vec<(String, Mat)>,
    page_rect: (f64,f64,f64,f64),
    quote: &str,
) {
    let mut updates: Vec<(ObjectId, Vec<u8>)> = Vec::new();

    for (name, ctm) in &do_calls {
        // Resolve the XObject to an ObjectId.
        let xobj_id = match resolve_xobject(doc, page_id, name) {
            Some(id) => id,
            None => continue,
        };

        // Read the XObject data via an IIFE so the immutable borrow on `doc`
        // is fully released before we write back later.
        let Some((plain, xobj_matrix)) = (|| -> Option<(Vec<u8>, Mat)> {
            let obj = doc.get_object(xobj_id).ok()?;
            let Object::Stream(s) = obj else { return None; };

            let is_form = s.dict.get(b"Subtype").ok()
                .and_then(|v| v.as_name().ok())
                .and_then(|n| std::str::from_utf8(n).ok())
                .map(|sub| sub == "Form")
                .unwrap_or(false);
            if !is_form { return None; }

            let xm: Mat = s.dict.get(b"Matrix").ok()
                .and_then(|v| v.as_array().ok())
                .and_then(|arr| {
                    if arr.len() < 6 { return None; }
                    Some([
                        obj_to_f64(&arr[0]).unwrap_or(1.0),
                        obj_to_f64(&arr[1]).unwrap_or(0.0),
                        obj_to_f64(&arr[2]).unwrap_or(0.0),
                        obj_to_f64(&arr[3]).unwrap_or(1.0),
                        obj_to_f64(&arr[4]).unwrap_or(0.0),
                        obj_to_f64(&arr[5]).unwrap_or(0.0),
                    ])
                })
                .unwrap_or_else(identity);

            let plain = s.get_plain_content().ok()?;
            Some((plain, xm))
        })() else { continue };

        // Combined page→XObject transform = inverse(CTM × XObject_matrix)
        let combined = concat(*ctm, xobj_matrix);
        let inv = invert(combined);
        let xobj_rect = transform_rect(inv, page_rect);

        if let Some(new_bytes) = redact_stream_bytes(&plain, xobj_rect, quote) {
            updates.push((xobj_id, new_bytes));
        }
    }

    for (id, bytes) in updates {
        if let Ok(Object::Stream(s)) = doc.get_object_mut(id) {
            s.set_plain_content(bytes);
        }
    }
}

// ── Quote-based structured scan across ALL streams (belt-and-suspenders) ────
fn redact_quote_in_all_streams(doc: &mut Document, quote: &str) {
    if quote.is_empty() { return; }
    let ids: Vec<ObjectId> = doc.objects.keys().cloned().collect();
    let mut updates: Vec<(ObjectId, Vec<u8>)> = Vec::new();

    for id in &ids {
        let plain = {
            let Ok(obj) = doc.get_object(*id) else { continue };
            let Object::Stream(s) = obj else { continue };
            match s.get_plain_content() { Ok(p) => p, Err(_) => continue }
        };
        let mut content = match Content::decode(&plain) { Ok(c) => c, Err(_) => continue };
        let mut changed = false;
        for op in &mut content.operations {
            match op.operator.as_str() {
                "Tj" | "'" | "\"" => {
                    if let Some(Object::String(bytes, _)) = op.operands.get_mut(0) {
                        if string_matches_quote(bytes, quote) { mask_pdf_string(bytes); changed = true; }
                    }
                }
                "TJ" => {
                    if let Some(Object::Array(parts)) = op.operands.get_mut(0) {
                        for p in parts.iter_mut() {
                            if let Object::String(bytes, _) = p {
                                if string_matches_quote(bytes, quote) { mask_pdf_string(bytes); changed = true; }
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        if changed {
            if let Ok(b) = content.encode() { updates.push((*id, b)); }
        }
    }
    for (id, b) in updates {
        if let Ok(Object::Stream(s)) = doc.get_object_mut(id) { s.set_plain_content(b); }
    }
}

// ── Raw-byte fallback (ASCII + UTF-16BE) across ALL streams ─────────────────
fn hard_replace_in_all_streams(doc: &mut Document, quote: &str) {
    if quote.is_empty() { return; }
    let q_ascii = quote.as_bytes().to_vec();
    let m_ascii = "*".repeat(quote.chars().count()).into_bytes();
    let q_utf16: Vec<u8> = quote.encode_utf16().flat_map(|u| u.to_be_bytes()).collect();
    let m_utf16: Vec<u8> = "*".repeat(quote.chars().count()).encode_utf16()
        .flat_map(|u| u.to_be_bytes()).collect();

    let ids: Vec<ObjectId> = doc.objects.keys().cloned().collect();
    for id in ids {
        if let Ok(Object::Stream(s)) = doc.get_object_mut(id) {
            let Ok(mut plain) = s.get_plain_content() else { continue };
            let r1 = replace_all_subs(&plain, &q_ascii, &m_ascii);
            plain  = replace_all_subs(&r1,    &q_utf16, &m_utf16);
            s.set_plain_content(plain);
        }
    }
}

// ── Public entry point ───────────────────────────────────────────────────────
pub fn apply_redactions(doc: &mut Document, items: Vec<RedactionItem>) {
    let pages = doc.get_pages();

    for item in items {
        let page_id = *pages.get(&item.page).expect("Page not found");

        let page_dict = doc.get_dictionary(page_id).expect("page dict");
        let mb = page_dict.get(b"MediaBox").expect("MediaBox")
            .as_array().expect("MediaBox array");
        let x1 = obj_to_f64(&mb[0]).unwrap_or(0.0);
        let y1 = obj_to_f64(&mb[1]).unwrap_or(0.0);
        let x2 = obj_to_f64(&mb[2]).unwrap_or(612.0);
        let y2 = obj_to_f64(&mb[3]).unwrap_or(792.0);
        let pw = x2 - x1;
        let ph = y2 - y1;

        let xp = (item.x_pct   / 100.0) * pw + x1;
        let yp = y2 - ((item.y_pct    / 100.0) * ph);
        let wd = (item.width_pct  / 100.0) * pw;
        let ht = (item.height_pct / 100.0) * ph;
        let redact_rect = (xp, yp - ht, xp + wd, yp);

        // Pass 1: page content stream (direct text) + collect Do invocations.
        let (new_page_bytes, do_calls) =
            process_page_content(doc, page_id, redact_rect, &item.quote);
        doc.change_page_content(page_id, new_page_bytes)
            .expect("change_page_content");

        // Pass 2: form XObjects referenced from this page, with correct coordinate transform.
        process_xobjects(doc, page_id, do_calls, redact_rect, &item.quote);

        // Pass 3: quote-based structured scan across every stream in the doc.
        redact_quote_in_all_streams(doc, &item.quote);

        // Pass 4: raw-byte ASCII/UTF-16 replacement across every stream.
        hard_replace_in_all_streams(doc, &item.quote);

        // Burn the black rectangle so the redaction is visually permanent.
        let burn = Content {
            operations: vec![
                Operation::new("q",  vec![]),
                Operation::new("rg", vec![0.into(), 0.into(), 0.into()]),
                Operation::new("re", vec![xp.into(), (yp-ht).into(), wd.into(), ht.into()]),
                Operation::new("f",  vec![]),
                Operation::new("Q",  vec![]),
            ],
        };
        doc.add_to_page_content(page_id, burn).expect("add burn");
    }
}