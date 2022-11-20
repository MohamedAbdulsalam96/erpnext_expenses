/*
*  ERPNext Expenses © 2022
*  Author:  Ameen Ahmed
*  Company: Level Up Marketing & Software Development Services
*  Licence: Please refer to LICENSE file
*/


class ExpensesDocDialog {
    constructor(doctype, title, indicator) {
        this._doctype = doctype;
        this._title = title;
        this._indicator = indicator;
        
        this._fields = [];
        this._fields_by_ref = [];
        this._fields_by_name = {};
        this._ready = false;
        this.__on_make = [];
        this.__on_ready = [];
        this.__on_clear = [];
        this._to_remove = [];
        this._properties = {};
        this._dialog = null;
        this._custom_btns = {};
        this._extends = [];
        
        this._setup();
    }
    _setup() {
        var me = this;
        E.call(
            'get_docfields',
            {doctype: this._doctype},
            E.fn(function(fields) {
                if (!E.is_arr(fields)) {
                    E.error('Unable to get the fields of {0}.', [this._doctype]);
                    return;
                }
                this._fields = fields;
                this._fields.unshift({
                    fieldname: 'error_message',
                    fieldtype: 'HTML',
                    read_only: 1,
                    hidden: 1
                });
                this._prepare_fields(this._fields);
            }, this)
        );
    }
    _prepare_fields(fields, parent_name) {
        E.each(fields, function(f) {
            let name = (parent_name ? parent_name + '.' : '') + f.fieldname;
            this._fields_by_name[name] = this._fields_by_ref.length;
            this._fields_by_ref.push(f);
            this._apply_field_properties(name);
            if (f.fields) this._prepare_fields(f.fields, name);
        }, this);
    }
    _on_make(fn, args) {
        this.__on_make.push(E.fn(function() {
            if (args) this[fn].apply(this, args);
            else this[fn].call(this);
        }, this));
        return this;
    }
    add_field(field, start) {
        if (!this._ready) return this._on_make('prepend_field', arguments);
        if (E.is_obj(field)) {
            if (start) this._fields.splice(1, 0, field);
            else this._fields.push(field);
            let name = field.fieldname;
            if (this._fields_by_name[name] == null) {
                this._fields_by_name[name] = this._fields_by_ref.length;
                this._fields_by_ref.push(field);
            }
        }
        return this;
    }
    remove_field(name) {
        if (!this._ready) return this._on_make('remove_field', arguments);
        this._fields = this._fields.filter(function(f) { return f.fieldname !== name; });
        if (this._fields_by_name[name] != null) {
            this._fields_by_ref.splice(this._fields_by_name[name], 1);
            delete this._fields_by_name[name];
        }
        return this;
    }
    remove_fields() {
        if (!this._ready) return this._on_make('remove_fields', arguments);
        var args = arguments;
        this._fields = this._fields.filter(function(f) { return !E.contains(args, f.fieldname); });
        E.each(args, function(n) {
            if (this._fields_by_name[n] != null) {
                this._fields_by_ref.splice(this._fields_by_name[n], 1);
                delete this._fields_by_name[n];
            }
        }, this);
        return this;
    }
    set_field_property(name, key, value) {
        if (!this._ready) return this._on_make('set_field_property', arguments);
        this._properties[name] = this._properties[name] || {};
        this._properties[name][key] = value;
        this._apply_field_properties(name);
        return this;
    }
    set_field_properties(name, props) {
        if (!this._ready) return this._on_make('set_field_properties', arguments);
        this._properties[name] = this._properties[name] || {};
        E.each(props, function(k, v) { this._properties[name][k] = v; }, this);
        this._apply_field_properties(name);
        return this;
    }
    set_fields_properties(data) {
        E.each(data, function(name, props) {
            this.set_field_properties(name, props);
        }, this);
        return this;
    }
    _apply_field_properties(name) {
        var field = this.get_field_by_name(name);
        if (field && E.is_obj(this._properties[name])) {
            E.each(this._properties[name], function(v, k) {
                if (v && E.is_func(v)) v = E.fn(v, this);
                field[k] = v;
            }, this);
            delete this._properties[name];
        }
    }
    replace_properties(data) {
        if (!this._ready) return this._on_make('replace_properties', arguments);
        E.each(data, function(v, k) {
            if (E.is_arr(v)) {
                E.each(this._fields_by_ref, function(f) {
                    if (f[k] != null) {
                        delete f[k];
                        f[v[0]] = v[1];
                    }
                });
                return;
            }
            let idx = this._fields_by_name[k];
            if (idx == null) return;
            var f = this._fields_by_ref[idx];
            E.each(v, function(v, p) {
                delete f[p];
                f[v[0]] = v[1];
            });
        }, this);
        return this;
    }
    remove_properties() {
        if (!this._ready) return this._on_make('remove_properties', arguments);
        var args = arguments;
        E.each(this._fields_by_ref, function(f) {
            E.each(args, function(k) { delete f[k]; });
        });
        return this;
    }
    sort_fields(fields) {
        if (!this._ready) return this._on_make('sort_fields', arguments);
        this._fields.sort(function(a, b) {
            return fields.indexOf(a.fieldname) - fields.indexOf(b.fieldname);
        });
        return this;
    }
    _on_ready(fn, args) {
        this.__on_ready.push(E.fn(function() {
            if (args) this[fn].apply(this, args);
            else this[fn].call(this);
        }, this));
        return this;
    }
    set_primary_action(label, callback) {
        if (!this._ready) return this._on_ready('set_primary_action', arguments);
        this._dialog.set_primary_action(__(label), E.fn(callback, this));
        return this;
    }
    set_secondary_action(label, callback) {
        if (!this._ready) return this._on_ready('set_secondary_action', arguments);
        this._dialog.set_secondary_action_label(__(label));
        this._dialog.set_secondary_action(E.fn(callback, this));
        return this;
    }
    add_custom_action(label, callback, type, position) {
        if (!this._ready) return this._on_ready('add_custom_action', arguments);
        let pos = ['start', 'center', 'end'];
        if (type && E.contains(pos, type)) {
            position = type;
            type = null;
        }
        type = type || 'primary';
        position = position || pos[2];
        let btn = $(`<button type='button' class='btn btn-${type} btn-sm'>
            ${__(label)}
        </button>`),
        primary = this._dialog.get_primary_btn();
        let key = frappe.scrub(label);
        key = key.replace('&', '_');
        this._custom_btns[key] = btn;
        if (position === pos[0]) primary.parent().prepend(btn);
        else if (position === pos[2]) primary.parent().append(btn);
        else if (position === pos[1]) primary.after(btn);
        btn.on('click', E.fn(callback, this));
        return this;
    }
    get_field_by_name(name) {
        let idx = this._fields_by_name[name];
        return idx != null ? this._fields_by_ref[idx] || null : null;
    }
    build() {
        if (this._ready) return this;
        this._ready = true;
        if (this.__on_make.length) {
            frappe.run_serially(this.__on_make)
            .finally(E.fn(function() { E.clear(this.__on_make); }, this));
        }
        this._dialog = new frappe.ui.Dialog({
            title: __(this._title),
            indicator: this._indicator || 'green',
            fields: this._fields,
        });
        let f = this._dialog.get_field('error_message');
        if (f && f.$wrapper) {
            f.$wrapper.append(`<div class="alert alert-danger alert-dismissible fade show" role="alert">
                <strong class="error-message"></strong>
                <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>`);
            this.$alert = f.$wrapper.find('.alert');
            this.$error = this.$alert.find('.error-message');
            this.$alert.alert();
        }
        if (this.__on_ready.length) {
            frappe.run_serially(this.__on_ready)
            .finally(E.fn(function() { E.clear(this.__on_ready); }, this));
        }
        return this;
    }
    set_title(text) {
        if (!this._ready) return this._on_ready('set_title', arguments);
        this._dialog.set_title(__(text));
        return this;
    }
    show() {
        if (!this._ready) return this._on_ready('show');
        this._dialog.show();
        return this;
    }
    hide() {
        if (!this._ready) return this._on_ready('hide');
        this._dialog.hide();
        this.clear();
        return this;
    }
    get_field(name) {
        return this._dialog && this._dialog.get_field(name);
    }
    get_values() {
        return this._dialog && this._dialog.get_values();
    }
    get_value(name) {
        return this._dialog && this._dialog.get_value(name);
    }
    set_value(name, value) {
        if (!this._ready) return this._on_ready('set_value', arguments);
        this._dialog.set_value(name, value);
        return this;
    }
    set_values(values) {
        if (!this._ready) return this._on_ready('set_values', arguments);
        this._dialog.set_values(values);
        return this;
    }
    get_row(table, idx) {
        let t = this.get_field(table);
        return t && t.grid && t.grid.get_row ? t.get_row(idx) : null;
    }
    get_row_name(table, idx) {
        let f = this.get_row(table, idx);
        return (f && f.doc && (f.doc.name || f.doc.idx)) || null;
    }
    get_child_value(table, idx, name) {
        let f = this.get_row(table, idx);
        if (f && f.get_field) f = f.get_field(name);
        return f && f.get_value && f.get_value();
    }
    set_child_value(table, idx, name, val) {
        let f = this.get_row(table, idx);
        if (f && f.get_field) f = f.get_field(name);
        if (f && f.set_value) f.set_value(val);
        return this;
    }
    set_invalid(name, error) {
        this.set_df_property(name, 'invalid', 1);
        let f = this._dialog && this._dialog.get_field(name);
        if (f && f.set_invalid) f.set_invalid();
        if (E.is_str(error) && f && f.set_new_description) f.set_new_description(error);
        return this;
    }
    set_child_invalid(table, idx, name, error) {
        let f = this.get_row(table, idx);
        if (f && f.get_field) f = f.get_field(name);
        if (f && f.df) f.df.invalid = 1;
        if (f && f.set_invalid) f.set_invalid();
        if (E.is_str(error) && f && f.set_new_description) f.set_new_description(error);
        return this;
    }
    set_valid(name) {
        this.set_df_property(name, 'invalid', false);
        let f = this._dialog && this._dialog.get_field(name);
        if (f && f.set_invalid) f.set_invalid();
        if (f && f.set_description) f.set_description();
        return this;
    }
    set_child_valid(table, idx, name) {
        let f = this.get_row(table, idx);
        if (f && f.get_field) f = f.get_field(name);
        if (f && f.df) f.df.invalid = 0;
        if (f && f.set_invalid) f.set_invalid();
        if (f && f.set_description) f.set_description();
        return this;
    }
    get_all_fields() {
        return this._dialog ? this._dialog.fields_dict : {};
    }
    set_df_property(name, prop, value) {
        if (!this._ready) return this._on_ready('set_df_property', arguments);
        this._dialog.set_df_property(name, prop, value);
        return this;
    }
    set_df_properties(name, props) {
        if (!this._ready) return this._on_ready('set_df_properties', arguments);
        E.each(props, function(v, k) {
            this._dialog.set_df_property(name, k, v);
        }, this);
        return this;
    }
    enable_all_fields() {
        if (!this._ready) return this._on_ready('enable_all_fields');
        E.each(this.get_all_fields(), function(f) {
            this.set_df_property(f.df.fieldname, 'read_only', 0);
        }, this);
        return this;
    }
    disable_all_fields() {
        if (!this._ready) return this._on_ready('disable_all_fields');
        E.each(this.get_all_fields(), function(f) {
            this.set_df_property(f.df.fieldname, 'read_only', 1);
        }, this);
        return this;
    }
    show_error(txt) {
        if (this.$alert && this.$error) {
            this.$error.html(txt);
            this.$alert.alert('show');
            frappe.ui.scroll(this.$alert);
        }
        this.set_df_property('error_message', 'hidden', 0);
        window.setTimeout(E.fn(function() { this.hide_error(); }, this), 3000);
    }
    hide_error() {
        if (this.$alert && this.$error) {
            this.$alert.alert('close');
            this.$error.html('');
        }
        this.set_df_property('error_message', 'hidden', 1);
    }
    on_clear(fn) {
        this.__on_clear.push(E.fn(fn, this));
        return this;
    }
    clear() {
        if (!this._ready) return this._on_ready('clear');
        this._dialog.clear();
        frappe.run_serially(this.__on_clear)
        .then(E.fn(function() { E.clear(this.__on_clear); }, this));
        return this;
    }
    extend(key, val) {
        if (E.is_obj(key)) {
            E.each(key, function(v, k) {
                this.extend(k, v);
            }, this);
            return this;
        }
        if (E.is_str(key) && !E.has(this._extends, key)) {
            this[key] = E.is_func(val) ? E.fn(val, this) : val;
            this._extends.push(key);
        }
        return this;
    }
    unset() {
        E.each(arguments, function(k) {
            if (!E.has(this._extends, key)) return;
            delete this[key];
            let idx = this._extends.indexOf(key);
            if (idx >= 0) this._extends.splice(idx, 1);
        }, this);
        return this;
    }
}

if (window.E) {
    window.E.extend('doc_dialog', function(doctype, title, indicator) {
        return new ExpensesDocDialog(doctype, title, indicator);
    });
}