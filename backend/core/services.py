def audit_on_create(user):
    return {"created_by": user, "updated_by": user}


def audit_on_update(user):
    return {"updated_by": user}
