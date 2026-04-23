const SMS = {
    inboxPage: 1,
    inboxTotalPage: 1,
    outboxPage: 1,
    outboxTotalPage: 1,
    inboxQuery: '',
    outboxQuery: '',
    inboxFilter: 'all',
    inboxCategory: 'all',
    draftInboxFilter: 'all',
    draftInboxCategory: 'all',
    isInboxFilterOpen: false,
    currentTab: 'inbox',
    activeMessage: null,
    searchTimers: {},

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
        container.innerHTML = '';
        var fragment = document.createDocumentFragment();

        messages.forEach(function(message) {
            var item = document.createElement('div');
            item.className = 'sms-item';
            item.dataset.id = self.getMessageId(message);

            if (type === 'inbox' && !self.isRead(message)) {
                item.classList.add('unread');
            }

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'sms-checkbox';
            checkbox.dataset.id = self.getMessageId(message);

            var avatar = document.createElement('div');
            avatar.className = 'sms-avatar';
            avatar.textContent = Utils.getInitial(self.getMessageNumber(message));

            var content = document.createElement('div');
            content.className = 'sms-content';

            var header = document.createElement('div');
            header.className = 'sms-header';

            var numberEl = document.createElement('span');
            numberEl.className = 'sms-number';
            numberEl.textContent = self.getMessageNumber(message);

            var dateEl = document.createElement('span');
            dateEl.className = 'sms-date';
            dateEl.textContent = Utils.formatDate(self.getMessageDate(message));

            var metaRow = document.createElement('div');
            metaRow.className = 'sms-meta-row';

            if (type === 'inbox' && !self.isRead(message)) {
                var unreadDot = document.createElement('span');
                unreadDot.className = 'sms-unread-dot';
                metaRow.appendChild(unreadDot);
            }

            if (type === 'inbox') {
                var badge = document.createElement('span');
                self.applyCategoryBadge(badge, message.category || 'unknown');
                metaRow.appendChild(badge);
            }

            var bodyEl = document.createElement('div');
            bodyEl.className = 'sms-body';
            bodyEl.textContent = self.getMessageBody(message);

            header.appendChild(numberEl);
            header.appendChild(dateEl);
            content.appendChild(header);
            if (metaRow.childNodes.length > 0) {
                content.appendChild(metaRow);
            }
            content.appendChild(bodyEl);

            item.appendChild(checkbox);
            item.appendChild(avatar);
            item.appendChild(content);

            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('sms-checkbox')) {
                    return;
                }
                self.openMessage(message, type);
            });

            checkbox.addEventListener('change', function() {
                self.updateSelectAllState(type);
            });

            fragment.appendChild(item);
        });

        container.appendChild(fragment);
    },

    async loadInbox() {
        var container = document.getElementById('inbox-list');
        container.innerHTML = '<div class="loading">' + I18N.t('sms.loading_messages') + '</div>';
        this.updateInboxFilterButton();

        try {
            var res = await API.getSMSInbox(this.inboxPage, this.inboxQuery, this.inboxFilter, this.inboxCategory);
            this.inboxTotalPage = res.total_page || 1;

            document.getElementById('inbox-page-info').textContent = I18N.t('sms.page', { page: this.inboxPage, total: this.inboxTotalPage });
            document.getElementById('inbox-prev').disabled = this.inboxPage <= 1;
            document.getElementById('inbox-next').disabled = this.inboxPage >= this.inboxTotalPage;
            document.getElementById('inbox-select-all').checked = false;

            this.renderList(container, res.messages || [], 'inbox');
        } catch (err) {
            container.innerHTML = '<div class="no-data">' + I18N.t('sms.failed_load_messages') + '</div>';
        }
    },

    async loadOutbox() {
        var container = document.getElementById('outbox-list');
        container.innerHTML = '<div class="loading">' + I18N.t('sms.loading_data') + '</div>';

        try {
            var res = await API.getSMSOutbox(this.outboxPage, this.outboxQuery);
            this.outboxTotalPage = res.total_page || 1;

            document.getElementById('outbox-page-info').textContent = I18N.t('sms.page', { page: this.outboxPage, total: this.outboxTotalPage });
            document.getElementById('outbox-prev').disabled = this.outboxPage <= 1;
            document.getElementById('outbox-next').disabled = this.outboxPage >= this.outboxTotalPage;
            document.getElementById('outbox-select-all').checked = false;

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

        if (!this.isValidNumber(number)) {
            Toast.warning(I18N.t('toast.sms_invalid_number'));
            return;
        }

        Utils.setButtonLoading(btn, true);

        try {
            var res = await API.sendSMS(number, message);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.sms_sent'));
                document.getElementById('sms-number').value = '';
                document.getElementById('sms-message').value = '';
                this.updateComposeStats('');
                App.switchSMSTab('outbox');
            } else {
                Toast.error(res.message || I18N.t('toast.sms_send_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        } finally {
            Utils.setButtonLoading(btn, false);
        }
    },

    async openMessage(message, type) {
        this.activeMessage = this.cloneMessage(message, type);
        this.showModal(this.activeMessage);

        if (type === 'inbox' && !this.isRead(this.activeMessage)) {
            await this.markMessageRead(this.activeMessage.id, true);
        }
    },

    showModal(message) {
        document.getElementById('modal-avatar').textContent = Utils.getInitial(this.getMessageNumber(message));
        document.getElementById('modal-number').textContent = this.getMessageNumber(message);
        document.getElementById('modal-date').textContent = Utils.formatDate(this.getMessageDate(message));
        document.getElementById('modal-body').textContent = this.getMessageBody(message);
        document.getElementById('modal-category-select').value = message.category || 'unknown';
        this.applyCategoryBadge(document.getElementById('modal-category'), message.category || 'unknown');
        document.getElementById('modal-category-select').disabled = message.type !== 'inbox';
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

    async deleteActiveMessage() {
        if (!this.activeMessage || !this.activeMessage.id) {
            return;
        }
        if (!confirm(I18N.t('confirm.delete_sms'))) {
            return;
        }

        try {
            var res = await API.deleteSMS(this.activeMessage.id);
            if (res.status === 'success') {
                Toast.success(I18N.t('toast.sms_deleted_count', { count: res.deleted || 1 }));
                this.closeModal();
                if (this.activeMessage.type === 'outbox') {
                    this.loadOutbox();
                } else {
                    this.loadInbox();
                }
            } else {
                Toast.error(I18N.t('toast.sms_delete_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        }
    },

    async setActiveCategory(category) {
        if (!this.activeMessage || this.activeMessage.type !== 'inbox') {
            return;
        }

        try {
            var res = await API.setSMSCategory(this.activeMessage.id, category);
            if (res.status === 'success') {
                this.activeMessage.category = res.category;
                this.activeMessage.category_source = res.category_source;
                this.applyCategoryBadge(document.getElementById('modal-category'), res.category);
                Toast.success(I18N.t('toast.sms_category_saved'));
                this.loadInbox();
            } else {
                Toast.error(I18N.t('toast.sms_category_save_failed'));
            }
        } catch (err) {
            Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
        }
    },

    replyToActiveMessage() {
        if (!this.activeMessage) {
            return;
        }
        this.closeModal();
        App.openSMSCompose(this.getMessageNumber(this.activeMessage));
    },

    async markMessageRead(id, silent) {
        if (!id) {
            return;
        }

        try {
            var res = await API.markSMSRead(id);
            if (res.status === 'success') {
                this.updateMessageReadState(id);
            } else if (!silent) {
                Toast.error(I18N.t('toast.sms_mark_read_failed'));
            }
        } catch (err) {
            if (!silent) {
                Toast.error(I18N.t('toast.error_prefix', { message: err.message }));
            }
        }
    },

    updateMessageReadState(id) {
        if (this.activeMessage && this.activeMessage.id === id) {
            this.activeMessage.read = 1;
        }

        var item = document.querySelector('.sms-item[data-id="' + id + '"]');
        if (item) {
            item.classList.remove('unread');
            var dot = item.querySelector('.sms-unread-dot');
            if (dot) {
                dot.remove();
            }
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
    },

    onSearchInput(type, value) {
        if (type === 'inbox') {
            this.inboxQuery = value.trim();
            this.inboxPage = 1;
        } else {
            this.outboxQuery = value.trim();
            this.outboxPage = 1;
        }

        this.scheduleLoad(type);
    },

    clearSearch(type) {
        var input = document.getElementById(type + '-search');
        input.value = '';
        this.onSearchInput(type, '');
    },

    syncInboxFilterDrafts() {
        this.draftInboxFilter = this.inboxFilter;
        this.draftInboxCategory = this.inboxCategory;
        document.getElementById('inbox-filter-draft').value = this.draftInboxFilter;
        document.getElementById('inbox-category-filter-draft').value = this.draftInboxCategory;
    },

    toggleInboxFilterPanel() {
        if (this.isInboxFilterOpen) {
            this.closeInboxFilterPanel();
            return;
        }
        this.openInboxFilterPanel();
    },

    openInboxFilterPanel() {
        this.syncInboxFilterDrafts();
        this.isInboxFilterOpen = true;
        document.getElementById('inbox-filter-panel').style.display = 'block';
        document.getElementById('inbox-filter-backdrop').style.display = window.innerWidth <= 480 ? 'block' : 'none';
        document.getElementById('inbox-filter-trigger').setAttribute('aria-expanded', 'true');
        this.updateInboxFilterButton();
    },

    closeInboxFilterPanel() {
        this.isInboxFilterOpen = false;
        document.getElementById('inbox-filter-panel').style.display = 'none';
        document.getElementById('inbox-filter-backdrop').style.display = 'none';
        document.getElementById('inbox-filter-trigger').setAttribute('aria-expanded', 'false');
        this.updateInboxFilterButton();
    },

    onInboxFilterDraftChange() {
        this.draftInboxFilter = document.getElementById('inbox-filter-draft').value;
        this.draftInboxCategory = document.getElementById('inbox-category-filter-draft').value;
    },

    applyInboxFilters() {
        this.onInboxFilterDraftChange();
        this.inboxFilter = this.draftInboxFilter;
        this.inboxCategory = this.draftInboxCategory;
        this.inboxPage = 1;
        this.closeInboxFilterPanel();
        this.updateInboxFilterButton();
        this.loadInbox();
    },

    resetInboxFilters() {
        this.draftInboxFilter = 'all';
        this.draftInboxCategory = 'all';
        this.inboxFilter = 'all';
        this.inboxCategory = 'all';
        document.getElementById('inbox-filter-draft').value = this.draftInboxFilter;
        document.getElementById('inbox-category-filter-draft').value = this.draftInboxCategory;
        this.inboxPage = 1;
        this.closeInboxFilterPanel();
        this.updateInboxFilterButton();
        this.loadInbox();
    },

    getInboxFilterCount() {
        var count = 0;
        if (this.inboxFilter !== 'all') {
            count++;
        }
        if (this.inboxCategory !== 'all') {
            count++;
        }
        return count;
    },

    updateInboxFilterButton() {
        var count = this.getInboxFilterCount();
        var badge = document.getElementById('inbox-filter-count');
        var trigger = document.getElementById('inbox-filter-trigger');
        badge.textContent = String(count);
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
        trigger.classList.toggle('active', count > 0 || this.isInboxFilterOpen);
    },

    handleDocumentClick(event) {
        if (!this.isInboxFilterOpen) {
            return;
        }
        var panel = document.getElementById('inbox-filter-panel');
        var trigger = document.getElementById('inbox-filter-trigger');
        if (panel.contains(event.target) || trigger.contains(event.target)) {
            return;
        }
        this.closeInboxFilterPanel();
    },

    scheduleLoad(type) {
        var self = this;
        clearTimeout(this.searchTimers[type]);
        this.searchTimers[type] = setTimeout(function() {
            if (type === 'inbox') {
                self.loadInbox();
            } else {
                self.loadOutbox();
            }
        }, 250);
    },

    updateComposeStats(text) {
        var message = text == null ? document.getElementById('sms-message').value : text;
        var length = message.length;
        var segmentLength = length > 160 ? 153 : 160;
        var segments = Math.max(1, Math.ceil(length / segmentLength));
        document.getElementById('sms-char-count').textContent = length;
        document.getElementById('sms-segment-info').textContent = I18N.t('sms.segment_count', { count: segments });
    },

    isValidNumber(number) {
        return /^[0-9+]{5,20}$/.test(number);
    },

    applyCategoryBadge(element, category) {
        var normalized = this.normalizeCategory(category);
        element.className = 'sms-category-badge ' + normalized;
        element.textContent = I18N.t('sms.category_' + normalized);
    },

    normalizeCategory(category) {
        if (category === 'marketing' || category === 'otp' || category === 'personal' || category === 'unknown') {
            return category;
        }
        return 'unknown';
    },

    cloneMessage(message, type) {
        return {
            id: this.getMessageId(message),
            number: this.getMessageNumber(message),
            body: this.getMessageBody(message),
            date: this.getMessageDate(message),
            read: message && message.read !== undefined ? message.read : 1,
            category: this.normalizeCategory(message && message.category ? message.category : 'unknown'),
            category_source: message && message.category_source ? message.category_source : 'auto',
            type: type
        };
    },

    getMessageId(message) {
        return message && message.id !== undefined && message.id !== null ? String(message.id) : '';
    },

    getMessageNumber(message) {
        return message && message.number ? String(message.number) : '-';
    },

    getMessageBody(message) {
        return message && message.body ? String(message.body) : '';
    },

    getMessageDate(message) {
        var parsedDate = message && message.date ? parseInt(message.date, 10) : NaN;
        return isNaN(parsedDate) ? Date.now() : parsedDate;
    },

    isRead(message) {
        return Number(message && message.read) === 1;
    }
};
