# ERPNext Expenses © 2022
# Author:  Ameen Ahmed
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to license.txt


import frappe
from frappe.query_builder.functions import Locate
from pypika.enums import Order
from pypika.terms import Criterion


def filter_search(doc, qry, doctype, search, relevance, filter_column=None):
    meta = frappe.get_meta(doctype)
    if txt:
        qry = qry.select(Locate(search, relevance).as_("_relevance"))
        qry = qry.orderby("_relevance", doc.modified, doc.idx, order=Order.desc)
        
        translated_search_doctypes = frappe.get_hooks("translated_search_doctypes")
        search_filters = []
        search_fields = [filter_column] if filter_column else []
        
        if meta.title_field:
            search_fields.append(meta.title_field)
        if meta.search_fields:
            search_fields.extend(meta.get_search_fields())

        for f in search_fields:
            fmeta = meta.get_field(f.strip())
            if (
                doctype not in translated_search_doctypes and
                (
                    f == "name" or
                    (
                        fmeta
                        and fmeta.fieldtype
                        in ["Data", "Text", "Small Text", "Long Text", "Link", "Select", "Read Only", "Text Editor"]
                    )
                )
            ):
                search_filters.append(doc.field(f.strip()).like(f"%{search}%"))
        
        if len(search_filters) > 1:
            qry = qry.where(Criterion.any(search_filters))
        else:
            qry = qry.where(search_filters.pop(0))
    
    if meta.get("fields", {"fieldname": "enabled", "fieldtype": "Check"}):
        qry = qry.where(doc.enabled == 1)
    if meta.get("fields", {"fieldname": "disabled", "fieldtype": "Check"}):
        qry = qry.where(doc.disabled != 1)
    
    return qry