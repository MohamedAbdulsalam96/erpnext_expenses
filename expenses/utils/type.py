# ERPNext Expenses © 2022
# Author:  Ameen Ahmed
# Company: Level Up Marketing & Software Development Services
# Licence: Please refer to license.txt


import frappe
from frappe import _
from pypika.terms import Criterion

from .account import *
from .common import error, get_cache, set_cache, get_cached_doc
from .search import filter_search, prepare_data


_TYPE = "Expense Type"
_TYPE_PARENT = "parent_type"
_TYPE_ACCOUNTS = "expense_accounts"


## Expense Type Tree
@frappe.whitelist()
def get_type_children(doctype, parent, is_root=False):
    fields = [
        "name as value",
        "is_group as expandable",
        _TYPE_PARENT + " as parent"
    ]
    filters = [
        ["docstatus", "<", 2],
        [
            "ifnull(`{0}`,\"\")".format(_TYPE_PARENT),
            "=",
            "" if is_root else parent
        ]
    ]

    return frappe.get_list(doctype, fields=fields, filters=filters)


## Expense Type Tree
@frappe.whitelist()
def add_type_node(args=None):
    from frappe.desk.treeview import make_tree_args

    if not args:
        args = frappe.local.form_dict

    args.doctype = _TYPE
    args = make_tree_args(**args)

    doc = frappe.new_doc(_TYPE)

    if args.get("ignore_permissions"):
        doc.flags.ignore_permissions = True
        args.pop("ignore_permissions")

    doc.update(args)

    if not doc.get(_TYPE_PARENT):
        doc.set(_TYPE_PARENT, args.get("parent"))

    if cint(doc.get("is_root")):
        doc.set(_TYPE_PARENT, None)
        doc.flags.ignore_mandatory = True

    doc.insert(ignore_permissions=True, ignore_mandatory=True)

    return doc.name


## Expense Type Form
## Expense Item Form
@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def search_types(doctype, txt, searchfield, start, page_len, filters, as_dict=False):
    doc = frappe.qb.DocType(_TYPE)
    qry = (frappe.qb.from_(doc)
        .select(doc.name)
        .where(doc.disabled == 0))
    
    qry = filter_search(doc, qry, _TYPE, txt, doc.name, "name")
    
    pdoc = frappe.qb.DocType(_TYPE).as_("parent")
    parent_qry = (frappe.qb.from_(pdoc)
        .select(pdoc.name)
        .where(pdoc.disabled == 0)
        .where(pdoc.is_group == 1)
        .where(pdoc.lft.lt(doc.lft))
        .where(pdoc.rgt.gt(doc.rgt))
        .orderby(doc.lft, order=Order.desc))
    qry = qry.where(Criterion.any(
        doc.parent_type == "",
        doc.parent_type.isin(parent_qry)
    ))
    
    if (is_not := filters.get("is_not")):
        qry = qry.where(doc.name != is_not)
    
    if filters.get("is_group") == 1:
        qry = qry.where(doc.is_group == 1)
    else:
        qry = qry.where(doc.is_group == 0)
    
    data = qry.run(as_dict=as_dict)
    
    data = prepare_data(data, "name", txt, as_dict)
    
    return data


## Expense Type
def type_children_exists(name):
    return frappe.db.exists(_TYPE, {_TYPE_PARENT: name})


## Self Item
def get_type_company_account_data(name, company):
    if not name or not isinstance(name, str):
        return {}
    
    ckey = f"{name}-{company}-accounts-data"
    cache = get_cache(_TYPE, ckey)
    if cache and isinstance(cache, dict):
        return cache
    
    data = get_company_account_data_by_parent(company, name, _TYPE, _TYPE_ACCOUNTS)
    
    if not data:
        for parent in get_cached_doc(_TYPE, name).get_ancestors():
            data = get_company_account_data_by_parent(company, parent, _TYPE, _TYPE_ACCOUNTS)
            if data and isinstance(data, dict):
                break
            
    if not data or not isinstance(data, dict):
        error(
            (_("Unable to get the account data of the type {0} and company {1}")
                .format(name, company))
        )
    
    set_cache(_TYPE, ckey, data)
    
    return data


## Self Item
def get_types_filter_query():
    doc = frappe.qb.DocType(_TYPE)
    return (frappe.qb.from_(doc)
        .select(doc.name)
        .where(doc.disabled == 0)
        .where(doc.is_group == 0))