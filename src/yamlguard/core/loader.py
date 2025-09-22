from ruamel.yaml import YAML
from io import StringIO


yaml = YAML(typ="safe")


def load_yaml(text: str):
    try:
        return yaml.load(StringIO(text))
    except Exception as e:
        raise ValueError(f"YAML_PARSE_ERROR: {e}")




def dump_yaml(obj) -> str:
    sio = StringIO()
    yaml.default_flow_style = False
    yaml.dump(obj, sio)
    return sio.getvalue()