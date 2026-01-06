/**
 * @fileoverview User Interface Management
 * Handles view switching, date formatting, visual indicators, and Markdown toggle.
 */

import { renderMarkdownToElement } from './textFormatter.js';

export const UI = {
    // Lazy-load DOM elements to prevent null reference on init
    views: {
        get login() { return document.getElementById('view-login'); },
        get register() { return document.getElementById('view-register'); },
        get dashboard() { return document.getElementById('view-dashboard'); },
        get editor() { return document.getElementById('view-editor'); }
    },

    isEditMode: true,

    /**
     * Switch the visible application view
     * @param {'login'|'register'|'dashboard'|'editor'} viewName 
     */
    showView(viewName) {
        // 1. Hide all main views
        Object.values(this.views).forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // 2. Show the requested view
        const target = this.views[viewName];
        if (target) {
            target.classList.remove('hidden');
        } else {
            console.error(`View "${viewName}" not found.`);
        }
    },

    /**
     * Format a timestamp into a human-readable string.
     * @param {Object|Date} timestamp - Firestore Timestamp or standard Date object
     * @returns {string} Formatted date string (e.g., "Oct 12, 02:30 PM")
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Just now';

        // Convert Firestore Timestamp to JS Date if necessary
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    /**
     * Update the visual save status indicator in the editor
     * @param {'saving'|'saved'|'error'} status 
     */
    updateSaveStatus(status) {
        const el = document.getElementById('save-status');
        if (!el) return;

        el.classList.remove('hidden', 'opacity-0');

        switch (status) {
            case 'saving':
                el.innerText = 'Saving...';
                el.classList.replace('text-brand-blue', 'text-yellow-500');
                el.classList.remove('text-red-500');
                break;
            case 'saved':
                el.innerText = 'All changes saved';
                el.classList.replace('text-yellow-500', 'text-brand-blue');
                // Fade out after delay
                setTimeout(() => el.classList.add('opacity-0'), 2000);
                break;
            case 'error':
                el.innerText = 'Error saving';
                el.classList.replace('text-yellow-500', 'text-red-500');
                break;
        }
    },

    /**
     * Toggle between Markdown Edit Mode and Preview Mode
     */
    toggleEditorMode() {
        this.isEditMode = !this.isEditMode;

        const textarea = document.getElementById('note-content');
        const preview = document.getElementById('note-preview');
        const indicator = document.getElementById('mode-indicator');

        if (this.isEditMode) {
            // Switch to Edit
            textarea.classList.remove('hidden');
            preview.classList.add('hidden');
            indicator.innerHTML = 'EDIT MODE <span class="opacity-50">| Ctrl+E</span>';
            textarea.focus();
        } else {
            // Switch to Preview
            const rawContent = textarea.value;
            renderMarkdownToElement(rawContent, preview);

            textarea.classList.add('hidden');
            preview.classList.remove('hidden');
            indicator.innerHTML = 'READ MODE <span class="opacity-50">| Ctrl+E</span>';
        }
    }
};
