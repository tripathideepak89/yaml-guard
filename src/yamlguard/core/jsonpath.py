from jsonpath_ng.ext import parse


def match(doc, path: str):
    try:
        return [m.value for m in parse(path).find(doc)]
    except Exception:
        return []