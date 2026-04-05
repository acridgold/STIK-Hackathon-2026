def safe_int(id_str):
    if id_str is None or str(id_str).lower() == "null" or str(id_str).strip() == "":
        return None
    try:
        return int(id_str)
    except (ValueError, TypeError):
        return None
