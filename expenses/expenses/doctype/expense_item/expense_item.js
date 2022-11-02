/*
*  ERPNext Expenses © 2022
*  Author:  Ameen Ahmed
*  Company: Level Up Marketing & Software Development Services
*  Licence: Please refer to license.txt
*/


frappe.ui.form.on('Expense Item', {
    setup: function(frm) {
        Expenses.init(frm);
        frm.E = {
            last_type: '',
            accounts_companies: new Expenses.UniqueArray(),
        };
    },
    onload: function(frm) {
        E.each(
            ('expense_section cost min_cost max_cost '
            + 'expense_column qty min_qty max_qty').split(' '),
            function(f, i) {
                let df = frm.get_docfield('expense_accounts', f);
                df.hidden = 0;
                if (i === 1 || i === 5) df.in_list_view = 1;
            }
        );
        frm.set_query('expense_type', {filters: {is_group: 0}});
        frm.set_query('company', 'expense_accounts', function() {
            return {
                query: E.path('search_type_companies'),
                filters: {expense_type: frm.doc.expense_type}
            };
        });
        frm.set_query('account', 'expense_accounts', function(doc, cdt, cdn) {
            return {filters: {
                is_group: 0,
                root_type: 'Expense',
                company: locals[cdt][cdn].company,
            }};
        });
        frm.add_fetch('account', 'account_currency', 'currency', 'Expense Account');
    },
    expense_type: function(frm) {
        var type = frm.doc.expense_type;
        if (type === frm.E.last_type) return;
        function change(f) {
            frm.E.last_type = type;
            frm.E.accounts_companies.clear();
            if (f) E.clear_table('expense_accounts');
        }
        if (!frm.E.last_type && !frm.doc.expense_accounts.length) {
            change();
            return;
        }
        frappe.confirm(
            __(
                'Changing the Expense Type will clear the Expense Accounts table. '
                + 'Do you want to continue?'
            ),
            function() { change(1); },
            function() { frm.set_value('expense_type', frm.E.last_type); }
        );
    },
});

frappe.ui.form.on('Expense Account', {
    before_expense_accounts_remove: function(frm, cdt, cdn) {
        frm.E.accounts_companies.del(locals[cdt][cdn].company, cdn);
    },
    company: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.company) {
            frm.E.accounts_companies.del(null, cdn);
            row.account = '';
            E.refresh_row_field('expense_accounts', cdn, 'account');
            return;
        }
        if (!frm.E.accounts_companies.has(row.company)) {
            frm.E.accounts_companies.rpush(row.company, cdn);
            return;
        }
        E.error(
            'The expense account for {0} has already been set',
            [row.company]
        );
        row.company = '';
        E.refresh_row_field('expense_accounts', cdn, 'company');
    },
    account: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.account || row.company) return;
        E.error('Please select a company first');
        row.account = '';
        E.refresh_row_field('expense_accounts', cdn, 'account');
    },
    cost: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!flt(row.cost)) return;
        if (flt(row.cost) < 0) {
            row.cost = 0;
            E.refresh_row_field('expense_accounts', cdn, 'cost');
            return;
        }
        row.min_cost = 0;
        row.max_cost = 0;
        E.refresh_row_field('expense_accounts', cdn, 'min_cost', 'max_cost');
    },
    min_cost: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn],
        val = flt(row.min_cost);
        if (!val) return;
        let max = flt(row.max_cost);
        if (val < 0 || flt(row.cost) > 0 || (max > 0 && val >= max)) {
            row.min_cost = 0;
            E.refresh_row_field('expense_accounts', cdn, 'min_cost');
        }
    },
    max_cost: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn],
        val = flt(row.max_cost);
        if (!val) return;
        let min = flt(row.min_cost);
        if (val < 0 || flt(row.cost) > 0 || (min > 0 && val <= min)) {
            row.max_cost = 0;
            E.refresh_row_field('expense_accounts', cdn, 'max_cost');
        }
    },
    qty: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!flt(row.qty)) return;
        if (flt(row.qty) < 0) {
            row.qty = 0;
            E.refresh_row_field('expense_accounts', cdn, 'qty');
            return;
        }
        row.min_qty = 0;
        row.max_qty = 0;
        E.refresh_row_field('expense_accounts', cdn, 'min_qty', 'max_qty');
    },
    min_qty: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn],
        val = flt(row.min_qty);
        if (!val) return;
        let max = flt(row.max_qty);
        if (val < 0 || flt(row.qty) > 0 || (max > 0 && val >= max)) {
            row.min_qty = 0;
            E.refresh_row_field('expense_accounts', cdn, 'min_qty');
        }
    },
    max_qty: function(frm, cdt, cdn) {
       let row = locals[cdt][cdn],
        val = flt(row.max_qty);
        if (!val) return;
        let min = flt(row.min_qty);
        if (val < 0 || flt(row.qty) > 0 || (min > 0 && val <= min)) {
            row.max_qty = 0;
            E.refresh_row_field('expense_accounts', cdn, 'max_qty');
        }
    },
});