def canonicalize(doc):
    # Sort mapping keys recursively and drop null/empty mappings
    if isinstance(doc, dict):
        return {k: canonicalize(v) for k, v in sorted(doc.items()) if v not in (None, {}, [])}
    if isinstance(doc, list):
        return [canonicalize(v) for v in doc]
    return doc