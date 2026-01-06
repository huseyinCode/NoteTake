/**
 * @fileoverview Main Application Logic
 * Orchestrates interaction between Firebase services (Auth, Firestore) and the UI.
 */

import { auth, db, appId, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from './firebase-init.js';
import { UI } from './ui.js';
import { GeminiService } from './gemini.js';

// ==========================================
// ==========================================
// 1. STATE MANAGEMENT
// ==========================================
let currentUser = null;
let currentNoteId = null;
let noteToDeleteId = null;
let notesData = []; // Helper cache for synchronous lookups
let searchTerm = ''; // Current search query
let autosaveTimeout = null;

// ==========================================
// 2. CORE APPLICATION MODULE
// ==========================================
const app = {
    // ... (previous methods) ...

    /**
     * Authenticate user with Email/Password
     */
    login: async () => {
        const emailEl = document.getElementById('input-email');
        const passwordEl = document.getElementById('input-password');
        const errorEl = document.getElementById('login-error');

        if (!emailEl || !passwordEl) return;

        try {
            await signInWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
            // Observer (onAuthStateChanged) handles routing
        } catch (error) {
            console.error("Login Error", error);
            if (errorEl) {
                errorEl.innerText = error.message;
                errorEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Register new user with Email/Password
     */
    register: async () => {
        const emailEl = document.getElementById('reg-email');
        const passwordEl = document.getElementById('reg-password');
        const errorEl = document.getElementById('reg-error');

        if (!emailEl || !passwordEl) return;

        try {
            await createUserWithEmailAndPassword(auth, emailEl.value, passwordEl.value);
            // Observer handles routing
        } catch (error) {
            console.error("Registration Error", error);
            if (errorEl) {
                errorEl.innerText = error.message;
                errorEl.classList.remove('hidden');
            }
        }
    },

    /**
     * Sign out current user
     */
    logout: async () => {
        try {
            await signOut(auth);
            window.location.reload();
        } catch (error) {
            console.error("Logout Error", error);
        }
    },

    /**
     * Create a new note document in Firestore
     * Path: users/{uid}/notes
     */
    createNewNote: async () => {
        if (!currentUser) {
            alert("Please log in to create notes.");
            return;
        }

        document.body.style.cursor = 'wait';
        try {
            const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'notes'), {
                title: '',
                content: '',
                updatedAt: serverTimestamp(),
                userId: currentUser.uid
            });

            // Immediately switch context to the new note
            app.openNote(docRef.id);
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Could not create note. Please check your network connection or AdBlocker settings.\n\n" + e.message);
        } finally {
            document.body.style.cursor = 'default';
        }
    },

    /**
     * Load note into editor view
     * @param {string} noteId - Document ID of the note
     */
    openNote: (noteId) => {
        currentNoteId = noteId;
        const note = notesData.find(n => n.id === noteId);

        // Handle race condition: Note deleted remotely
        if (!note) {
            app.showDashboard();
            return;
        }

        // populate UI fields
        const titleEl = document.getElementById('note-title');
        const contentEl = document.getElementById('note-content');
        const lastEditedEl = document.getElementById('last-edited');

        if (titleEl) titleEl.value = note.title || '';
        if (contentEl) contentEl.value = note.content || '';
        if (lastEditedEl) lastEditedEl.innerText = `Last edited: ${UI.formatDate(note.updatedAt)}`;

        // Force Edit Mode
        UI.isEditMode = true;
        if (contentEl) contentEl.classList.remove('hidden');
        const previewEl = document.getElementById('note-preview');
        if (previewEl) previewEl.classList.add('hidden');

        const indicator = document.getElementById('mode-indicator');
        if (indicator) indicator.innerHTML = 'EDIT MODE <span class="opacity-50">| Ctrl+E</span>';

        UI.showView('editor');
        app.renderSidebar();
    },

    /**
     * Return to Dashboard view
     */
    showDashboard: () => {
        currentNoteId = null;
        UI.showView('dashboard');
    },

    /**
     * Render the grid of notes on the dashboard
     */
    renderDashboard: () => {
        const grid = document.getElementById('notes-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const emptyState = document.getElementById('empty-state');

        // Filter notes based on local search term
        const filteredNotes = notesData.filter(note => {
            const term = searchTerm.toLowerCase();
            const title = (note.title || '').toLowerCase();
            const content = (note.content || '').toLowerCase();
            return title.includes(term) || content.includes(term);
        });

        if (filteredNotes.length === 0) {
            if (emptyState) {
                emptyState.classList.remove('hidden');
                // Customize message for search vs empty
                const msg = emptyState.querySelector('p');
                if (msg) msg.innerText = searchTerm ? 'No matching notes found.' : 'No notes yet.';
            }
            return;
        }
        if (emptyState) emptyState.classList.add('hidden');

        filteredNotes.forEach(note => {
            const div = document.createElement('div');
            // Card Styles
            div.className = "bg-white/5 backdrop-blur-sm rounded-2xl p-6 h-56 cursor-pointer hover:bg-white/10 transition-all flex flex-col border border-white/5 hover:border-brand-blue/50 group relative overflow-hidden";
            div.onclick = () => app.openNote(note.id);

            const title = note.title || 'Untitled Note';
            // Simple strip-markdown for preview text
            const preview = note.content
                ? note.content.replace(/[#*_`\[\]]/g, '').slice(0, 120) + (note.content.length > 120 ? '...' : '')
                : 'No content';
            const date = UI.formatDate(note.updatedAt);

            div.innerHTML = `
                <!-- Background Effect -->
                <div class="absolute -right-10 -top-10 w-32 h-32 bg-brand-blue/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                
                <!-- Delete Action -->
                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 z-20">
                    <button onclick="event.stopPropagation(); app.requestDelete(event, '${note.id}')" class="text-gray-400 hover:text-red-400 p-2 rounded-xl hover:bg-white/10 transition-colors backdrop-blur-md" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>

                <!-- Content -->
                <div class="relative z-10 flex flex-col h-full">
                    <h3 class="font-bold text-lg text-white truncate mb-2 group-hover:text-brand-blue transition-colors">${title}</h3>
                    <div class="flex-1 overflow-hidden relative">
                        <p class="text-sm text-gray-400 leading-relaxed line-clamp-4">${preview}</p>
                        <div class="absolute bottom-0 w-full h-8 bg-gradient-to-t from-[#1e293b]/0 to-transparent"></div>
                    </div>
                    <div class="mt-4 flex items-center gap-2 pt-4 border-t border-white/5">
                         <svg class="w-3 h-3 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span class="text-xs text-brand-blue font-medium tracking-wide">${date}</span>
                    </div>
                </div>
            `;
            grid.appendChild(div);
        });
    },

    /**
     * Render the sidebar list in editor mode
     */
    renderSidebar: () => {
        const list = document.getElementById('sidebar-notes-list');
        if (!list) return;
        list.innerHTML = '';

        notesData.forEach(note => {
            const btn = document.createElement('div');
            const isActive = note.id === currentNoteId;
            const baseClass = "w-full text-left px-4 py-3 rounded-full text-sm cursor-pointer truncate transition-all mb-1";
            const activeClass = isActive
                ? "bg-[#374151] text-white border-l-4 border-brand-blue"
                : "text-gray-400 hover:bg-[#1f2937] hover:text-white";

            btn.className = `${baseClass} ${activeClass} flex justify-between items-center group`;
            btn.onclick = () => app.openNote(note.id);

            btn.innerHTML = `
                <span class="truncate flex-1 pr-2">${note.title || 'Untitled'}</span>
                <button onclick="event.stopPropagation(); app.requestDelete(event, '${note.id}')" class="text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            `;
            list.appendChild(btn);
        });
    },

    /**
     * Trigger Delete Confirmation Modal
     */
    requestDelete: (e, id) => {
        if (e) e.stopPropagation();
        if (!id) return;
        noteToDeleteId = id;
        const modal = document.getElementById('modal-delete');
        if (modal) modal.classList.remove('hidden');
    },

    closeModal: () => {
        noteToDeleteId = null;
        const modal = document.getElementById('modal-delete');
        if (modal) modal.classList.add('hidden');
    },

    /**
     * Execute deletion via Firestore
     */
    confirmDelete: async () => {
        if (!noteToDeleteId || !currentUser) return;

        try {
            await deleteDoc(doc(db, 'users', currentUser.uid, 'notes', noteToDeleteId));

            // If deleting current note, navigate away
            if (currentNoteId === noteToDeleteId) {
                app.showDashboard();
            }
            app.closeModal();
        } catch (e) {
            console.error("Error deleting note:", e);
        }
    },

    /**
     * Open AI Modal
     */
    openAIModal: () => {
        const modal = document.getElementById('modal-ai');
        const apiKeyInput = document.getElementById('ai-api-key');
        const keySection = document.getElementById('ai-key-section');

        // Check for key
        const key = GeminiService.getApiKey();
        if (key) {
            if (apiKeyInput) apiKeyInput.value = key;
        } else {
            if (keySection) keySection.classList.remove('hidden');
        }

        // Reset UI state
        app.resetAIModal();

        if (modal) modal.classList.remove('hidden');
    },

    closeAIModal: () => {
        const modal = document.getElementById('modal-ai');
        if (modal) modal.classList.add('hidden');
    },

    resetAIModal: () => {
        document.getElementById('ai-prompt').value = '';
        document.getElementById('ai-result').innerText = '';
        document.getElementById('ai-response-container').classList.add('hidden');
        document.getElementById('ai-result-actions').classList.add('hidden');
        document.getElementById('btn-ai-generate').classList.remove('hidden');
        document.getElementById('ai-loading').classList.add('hidden');
    },

    setAIPrompt: (text) => {
        const promptEl = document.getElementById('ai-prompt');
        if (promptEl) promptEl.value = text;
    },

    /**
     * Run Gemini Generation
     */
    runAI: async () => {
        const promptInput = document.getElementById('ai-prompt');
        const apiKeyInput = document.getElementById('ai-api-key');
        const loading = document.getElementById('ai-loading');
        const resultContainer = document.getElementById('ai-response-container');
        const resultText = document.getElementById('ai-result');
        const btnGenerate = document.getElementById('btn-ai-generate');
        const actions = document.getElementById('ai-result-actions');

        const prompt = promptInput.value.trim();
        const key = apiKeyInput.value.trim();

        if (!prompt) {
            alert("Please enter a prompt.");
            return;
        }

        // Save key if provided
        if (key) {
            GeminiService.setApiKey(key);
        } else if (!GeminiService.getApiKey()) {
            alert("Please provide a Gemini API Key.");
            return;
        }

        // UI Loading State
        loading.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        btnGenerate.classList.add('hidden');

        try {
            // Check if context is needed (e.g. "Summarize THIS note")
            let finalPrompt = prompt;
            if (prompt.toLowerCase().includes('this note') || prompt.toLowerCase().includes('summarize')) {
                const currentContent = document.getElementById('note-content').value;
                finalPrompt = `${prompt}:\n\n${currentContent}`;
            }

            const generatedText = await GeminiService.generateContent(finalPrompt);

            // Show Result
            resultText.innerText = generatedText;
            resultContainer.classList.remove('hidden');
            actions.classList.remove('hidden');
        } catch (error) {
            alert(`Error: ${error.message}`);
            btnGenerate.classList.remove('hidden');
        } finally {
            loading.classList.add('hidden');
        }
    },

    /**
     * Apply AI result to note
     * @param {'append'|'replace'} mode 
     */
    applyAIResult: (mode) => {
        const resultText = document.getElementById('ai-result').innerText;
        const contentEl = document.getElementById('note-content');

        if (!contentEl) return;

        if (mode === 'replace') {
            contentEl.value = resultText;
        } else {
            contentEl.value += `\n\n${resultText}`;
        }

        // Trigger autosave
        app.handleInput();
        app.closeAIModal();
    },

    /**
     * Handle text input with debounced Autosave
     */
    handleInput: () => {
        UI.updateSaveStatus('saving');

        if (autosaveTimeout) clearTimeout(autosaveTimeout);

        // Save after 1 second of inactivity
        autosaveTimeout = setTimeout(async () => {
            if (!currentUser || !currentNoteId) return;

            const titleEl = document.getElementById('note-title');
            const contentEl = document.getElementById('note-content');

            const title = titleEl ? titleEl.value : '';
            const content = contentEl ? contentEl.value : '';

            try {
                const noteRef = doc(db, 'users', currentUser.uid, 'notes', currentNoteId);
                await updateDoc(noteRef, {
                    title: title,
                    content: content,
                    updatedAt: serverTimestamp()
                });
                UI.updateSaveStatus('saved');

                const lastEditedEl = document.getElementById('last-edited');
                if (lastEditedEl) lastEditedEl.innerText = 'Last edited: Just now';
            } catch (e) {
                console.error("Error saving:", e);
                UI.updateSaveStatus('error');
            }
        }, 1000);
    }
};

// Expose app and UI to global scope for HTML event handlers
window.app = app;
window.UI = UI;

// ==========================================
// 3. EVENT LISTENERS & INITIALIZATION
// ==========================================

// Auth State Observer
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        // User Authenticated
        UI.showView('dashboard');

        const emailDisplay = document.getElementById('user-email-display');
        if (emailDisplay) emailDisplay.innerText = user.email || 'User';

        // Subscribe to Notes Collection (Realtime)
        const q = query(
            collection(db, 'users', user.uid, 'notes'),
            orderBy('updatedAt', 'desc')
        );

        onSnapshot(q, (snapshot) => {
            notesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Refresh UI Views
            app.renderDashboard();
            app.renderSidebar();
        }, (error) => {
            console.error("Firestore Listen Error:", error);
        });

    } else {
        // User Signed Out
        UI.showView('login');
        notesData = [];
    }
});

// Button Bindings
const btnLogin = document.getElementById('btn-login');
if (btnLogin) btnLogin.addEventListener('click', app.login);

const btnRegister = document.getElementById('btn-register');
if (btnRegister) btnRegister.addEventListener('click', app.register);

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) btnLogout.addEventListener('click', app.logout);

// Live Search Binding
const searchInput = document.getElementById('search-input');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        app.renderDashboard();
    });
}

// Editor Input Bindings
const titleInput = document.getElementById('note-title');
if (titleInput) titleInput.addEventListener('input', app.handleInput);

const contentInput = document.getElementById('note-content');
if (contentInput) {
    contentInput.addEventListener('input', (e) => {
        app.handleInput();
    });
}

// Global Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Only active if editor view is present
    const editorView = document.getElementById('view-editor');

    // Ctrl+E: Toggle Read/Edit Mode
    if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === 'E')) {
        if (!editorView.classList.contains('hidden')) {
            e.preventDefault();
            UI.toggleEditorMode();
        }
    }

    // Ctrl+K: Focus Search Bar
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        const search = document.getElementById('search-input');
        if (search) {
            // If currently in editor, go back to dashboard first to show search
            const dashboardHidden = document.getElementById('view-dashboard').classList.contains('hidden');
            if (dashboardHidden) {
                app.showDashboard();
            }
            // Small delay to ensure view transition allows focus
            setTimeout(() => search.focus(), 50);
        }
    }
});
