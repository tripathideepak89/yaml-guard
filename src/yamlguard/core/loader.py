from io import StringIO

from ruamel.yaml import YAML

yaml = YAML(typ="safe")


def load_yaml(text: str):
    try:
        # support multi-document YAML (--- ... ---)
        docs = list(yaml.load_all(StringIO(text)))
        if not docs:
            return None
        return docs if len(docs) > 1 else docs[0]
    except Exception as e:
        raise ValueError(f"YAML_PARSE_ERROR: {e}") from e


def dump_yaml(obj) -> str:
    sio = StringIO()
    yaml.default_flow_style = False
    if isinstance(obj, list):
        # write multi-doc if list of docs
        for i, d in enumerate(obj):
            if i:
                sio.write("\n---\n")
            yaml.dump(d, sio)
    else:
        yaml.dump(obj, sio)
    return sio.getvalue()
