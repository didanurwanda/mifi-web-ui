const SMS = {
    inboxPage: 1,
    inboxTotalPage: 1,
    outboxPage: 1,
    outboxTotalPage: 1,
    currentTab: 'inbox',

    resetPagination() {
        this.inboxPage = 1;
        this.inboxTotalPage = 1;
        this.outboxPage = 1;
        this.outboxTotalPage = 1;
    },

    renderList(container, messages, type) {
        if (messages.length === 0) {
            container.innerHTML = '<div class="no-data">' + I18N.t('sms.no_messages') + '</div>';
            return;
        }

        var self = this;
        var html = '';
        messages.forEach(function(m) {
            html += '<div class="sms-item" data-id="' + m.id + '" data-number="' + m.number + '" data-date="' + m.date + '" data-body="' + Utils.escapeHtml(m.body) + '">' +
                '<input type="checkbox" class="sms-checkbox" data-id="' + m.id + '">' +
                '<div class="sms-avatar">' + Utils.getInitial(m.number) + '</div>' +
                '<div class="sms-content">' +
                '<div class="sms-header">' +
                '<span class="sms-number">' + m.number + '</span>' +
                '<span class="sms-date">' + Utils.formatDate(m.date) + '</span>' +
                '</div>' +
                '<div class="sms-body">' + m.body + '</div>' +
                '</div></div>';
        });
        container.innerHTML = html;

        container.querySelectorAll('.sms-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('sms-checkbox')) {
                    return;
                }
                self.showModal(
                    item.dataset.number,
                    parseInt(item.dataset.date),
                    item.dataset.body
                );
            });
        });

        container.querySelectorAll('.sms-checkbox').forEach(function(cb) {
            cb.addEventListener('change', function() {
                self.updateSelectAllState(type);
            });
        });
    },

    async loadInbox() {
        var container = document.getElementById('inbox-list');
        container.innerHTML = '<div class="loading">' + I18N.t('sms.loading_messages') + '</div>';

        var self = this;
        try {
            var res = await API.getSMSInbox(this.inboxPage);
            this.inboxTotalPage = res.total_page || 1;

            document.getElementById('inbox-page-info').textContent = I18N.t('sms.page', { page: this.inboxPage, total: this.inboxTotalPage });
            document.getElementById('inbox-prev').disabled = this.inboxPage <= 1;
            document.getElementById('inbox-next').disabled = this.inboxPage >= this.inboxTotalPage;

            this.renderList(container, res.messages || [], 'inbox');
        } catch (err) {
            container.innerHTML = '<div class="no-data">' + I18N.t('sms.failed_load_messages') + '</div>';
        }
    },

    async loadOutbox() {
        var container = document.getElementById('outbox-list');
        container.innerHTML = '<div class="loading">' + I18N.t('sms.loading_data') + '</div>';

        try {
            var res = await API.getSMSOutbox(this.outboxPage);
            this.outboxTotalPage = res.total_page || 1;

            document.getElementById('outbox-page-info').textContent = I18N.t('sms.page', { page: this.outboxPage, total: this.outboxTotalPage });
            document.getElementById('outbox-prev').disabled = this.outboxPage <= 1;
            document.getElementById('outbox-next').disabled = this.outboxPage >= this.outboxTotalPage;

            this.renderList(container, res.messages || [], 'outbox');
        } catch (err) {
            container.innerHTML = '<div class="no-data">' + I18N.t('sms.failed_load_data') + '</div>';
        }
    },

    async send() {
        var number = document.getElementById('sms-number').value.trim();
        var message = document.getElementById('sms-message').value.trim();
        var btn = document.getElementById('send-sms-btn');

        if (!number || !message) {
            Toast.warning(I18N.t('toast.sms_required'));
            return;
        }

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.sendSMS(number, message);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.sms_sent'));
                App.switchSMSTab('outbox');
            } else {
                Toast.error(I18N.t('toast.sms_send_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    showModal(number, date, body) {
        document.getElementById('modal-avatar').textContent = Utils.getInitial(number);
        document.getElementById('modal-number').textContent = number;
        document.getElementById('modal-date').textContent = Utils.formatDate(date);
        document.getElementById('modal-body').textContent = body;
        document.getElementById('sms-modal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('sms-modal').style.display = 'none';
    },

    toggleSelectAll(type, checked) {
        var container = document.getElementById(type + '-list');
        container.querySelectorAll('.sms-checkbox').forEach(function(cb) {
            cb.checked = checked;
            var item = cb.closest('.sms-item');
            if (item) item.classList.toggle('selected', checked);
        });
    },

    updateSelectAllState(type) {
        var container = document.getElementById(type + '-list');
        var checkboxes = container.querySelectorAll('.sms-checkbox');
        var checked = container.querySelectorAll('.sms-checkbox:checked');
        var selectAll = document.getElementById(type + '-select-all');

        selectAll.checked = checkboxes.length > 0 && checkboxes.length === checked.length;

        container.querySelectorAll('.sms-checkbox').forEach(function(cb) {
            var item = cb.closest('.sms-item');
            if (item) item.classList.toggle('selected', cb.checked);
        });
    },

    getSelectedIds(type) {
        var container = document.getElementById(type + '-list');
        var ids = [];
        container.querySelectorAll('.sms-checkbox:checked').forEach(function(cb) {
            ids.push(cb.dataset.id);
        });
        return ids;
    },

    async deleteSelected(type) {
        var ids = this.getSelectedIds(type);
        if (ids.length === 0) {
            Toast.warning(I18N.t('toast.select_sms_to_delete'));
            return;
        }
        if (!confirm(I18N.t('confirm.delete_selected_sms', { count: ids.length }))) return;

        try {
            var res = await API.deleteMultipleSMS(ids);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.sms_deleted_count', { count: res.deleted }));
                document.getElementById(type + '-select-all').checked = false;
                if (type === 'inbox') this.loadInbox();
                else this.loadOutbox();
            } else {
                Toast.error(I18N.t('toast.sms_delete_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        }
    },

    async deleteAll(type) {
        if (!confirm(I18N.t('confirm.delete_all_sms'))) return;

        try {
            var res = await API.deleteAllSMS();
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.sms_deleted_count', { count: res.deleted }));
                document.getElementById(type + '-select-all').checked = false;
                if (type === 'inbox') this.loadInbox();
                else this.loadOutbox();
            } else {
                Toast.error(I18N.t('toast.sms_delete_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        }
    },

    prevPage(type) {
        if (type === 'inbox') {
            if (this.inboxPage > 1) {
                this.inboxPage--;
                this.loadInbox();
            }
        } else {
            if (this.outboxPage > 1) {
                this.outboxPage--;
                this.loadOutbox();
            }
        }
    },

    nextPage(type) {
        if (type === 'inbox') {
            if (this.inboxPage < this.inboxTotalPage) {
                this.inboxPage++;
                this.loadInbox();
            }
        } else {
            if (this.outboxPage < this.outboxTotalPage) {
                this.outboxPage++;
                this.loadOutbox();
            }
        }
    }
};
