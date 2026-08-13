from drf_spectacular.utils import extend_schema


def extend_schema_for_viewset(action_docs: dict) -> dict:
    """Build the extend_schema_view() kwargs from a {action_name: extend_schema kwargs} dict."""
    return {action: extend_schema(**opts) for action, opts in action_docs.items()}
