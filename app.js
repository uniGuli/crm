import { db } from './db.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('crmApp', () => ({
        isAuthenticated: false,
        currentUser: null,
        currentPerson: null,
        authEmail: '',
        authPassword: '',
        authError: '',

        activeTab: 'orgs',
        viewMode: 'list',

        orgs: [],
        people: [],
        interactions: [],

        // Search queries for each list view
        orgSearch: '',
        peopleSearch: '',
        interactionSearch: '',
        interactionFilter: 'completed',

        selectedOrgId: null,
        selectedPersonId: null,
        selectedInteractionId: null,

        formOrg: {},
        contactMode: 'existing',
        newContact: { first_name: '', last_name: '', role: '', email: '', phone: '' },
        
        formPerson: {},
        formInteraction: {},

        async init() {
            db.onAuthStateChange(async (event, session) => {
                if (session && session.user) {
                    this.isAuthenticated = true;
                    this.currentUser = session.user;
                    this.currentPerson = await db.getCurrentPersonProfile(this.currentUser.email);
                    await this.loadData();
                } else {
                    this.isAuthenticated = false;
                    this.currentUser = null;
                    this.currentPerson = null;
                }
            });

            const session = await db.getSession();
            if (session && session.user) {
                this.isAuthenticated = true;
                this.currentUser = session.user;
                this.currentPerson = await db.getCurrentPersonProfile(this.currentUser.email);
                await this.loadData();
            }

            // Handle browser back/forward buttons
            window.addEventListener('popstate', (event) => {
                if (event.state) {
                    this.activeTab = event.state.activeTab || 'orgs';
                    this.viewMode = event.state.viewMode || 'list';
                    this.selectedOrgId = event.state.selectedOrgId || null;
                    this.selectedPersonId = event.state.selectedPersonId || null;
                    this.selectedInteractionId = event.state.selectedInteractionId || null;
                }
            });
        },

        pushState() {
            const state = {
                activeTab: this.activeTab,
                viewMode: this.viewMode,
                selectedOrgId: this.selectedOrgId,
                selectedPersonId: this.selectedPersonId,
                selectedInteractionId: this.selectedInteractionId
            };
            const url = `#${this.activeTab}-${this.viewMode}`;
            history.pushState(state, '', url);
        },

        async handleAuth() {
            this.authError = '';
            try {
                if (this.isSignUp) {
                    await db.signUp(this.authEmail, this.authPassword);
                    alert('Check your email for confirmation link or log in.');
                } else {
                    await db.signIn(this.authEmail, this.authPassword);
                }
            } catch (err) {
                this.authError = err.message;
            }
        },

        async logout() {
            await db.signOut();
            this.isAuthenticated = false;
            this.currentUser = null;
            this.currentPerson = null;
        },

        async loadData() {
            try {
                const data = await db.fetchAll();
                this.orgs = data.orgs;
                this.people = data.people;
                this.interactions = data.interactions;
                if (this.currentUser) {
                    this.currentPerson = await db.getCurrentPersonProfile(this.currentUser.email);
                }
            } catch (err) {
                console.error('Error loading data:', err);
            }
        },

        goToTab(tab) {
            this.activeTab = tab;
            this.viewMode = 'list';
            this.selectedOrgId = null;
            this.selectedPersonId = null;
            this.selectedInteractionId = null;
            this.pushState();
        },

        getOrgName(id) {
            let org = this.orgs.find(o => o.id === id);
            return org ? org.name : '—';
        },

        getPersonName(id) {
            let p = this.people.find(person => person.id === id);
            return p ? `${p.first_name} ${p.last_name}` : '—';
        },

        getPeopleForOrg(orgId) {
            return this.people.filter(p => p.organization_id === orgId);
        },

        getInteractionsForOrg(orgId) {
            return this.interactions.filter(i => i.organization_id === orgId);
        },

        getInteractionsForPerson(personId) {
            return this.interactions.filter(i => i.people_ids && i.people_ids.includes(personId));
        },

        // --- Search helper matching any field in data record ---
        matchRecord(record, query) {
            if (!query || !query.trim()) return true;
            const q = query.toLowerCase();
            return Object.values(record).some(val => {
                if (val === null || val === undefined) return false;
                if (Array.isArray(val)) {
                    return val.some(item => String(item).toLowerCase().includes(q));
                }
                return String(val).toLowerCase().includes(q);
            });
        },

        get filteredOrgs() {
            return this.orgs.filter(org => this.matchRecord(org, this.orgSearch));
        },

        get filteredPeople() {
            return this.people.filter(p => this.matchRecord(p, this.peopleSearch));
        },

        get filteredInteractions() {
            return this.interactions.filter(i => {
                const matchesStatus = (i.status || 'completed') === this.interactionFilter;
                const matchesSearch = this.matchRecord(i, this.interactionSearch);
                return matchesStatus && matchesSearch;
            });
        },

        getStatusBadgeClass(status) {
            if (status === 'upcoming') return 'bg-indigo-100 text-indigo-700';
            if (status === 'overdue') return 'bg-red-100 text-red-700';
            return 'bg-gray-100 text-gray-700';
        },

        getOrgStatusBadgeClass(status) {
            switch(status) {
                case 'partner': return 'bg-green-100 text-green-700';
                case 'research': return 'bg-purple-100 text-purple-700';
                case 'contact': return 'bg-amber-100 text-amber-700';
                case 'unresponsive': return 'bg-rose-100 text-rose-700';
                default: return 'bg-gray-100 text-gray-700';
            }
        },

        viewOrgDetail(id) {
            this.activeTab = 'orgs';
            this.selectedOrgId = id;
            this.viewMode = 'detail';
            this.pushState();
        },

        viewPersonDetail(id) {
            this.activeTab = 'people';
            this.selectedPersonId = id;
            this.viewMode = 'detail';
            this.pushState();
        },

        viewInteractionDetail(id) {
            this.activeTab = 'interactions';
            this.selectedInteractionId = id;
            this.viewMode = 'detail';
            this.pushState();
        },

        get selectedOrg() {
            return this.orgs.find(o => o.id === this.selectedOrgId);
        },

        get selectedPerson() {
            return this.people.find(p => p.id === this.selectedPersonId);
        },

        get selectedInteraction() {
            return this.interactions.find(i => i.id === this.selectedInteractionId);
        },

        // --- ORGANIZATIONS CRUD ---
        openOrgForm() {
            this.formOrg = { name: '', description: '', website: '', phone: '', primary_contact_id: null, status: 'research', misc: '' };
            this.contactMode = 'existing';
            this.newContact = { first_name: '', last_name: '', role: '', email: '', phone: '' };
            this.viewMode = 'form';
            this.pushState();
        },

        editOrg(org) {
            this.formOrg = { ...org };
            this.contactMode = 'existing';
            this.newContact = { first_name: '', last_name: '', role: '', email: '', phone: '' };
            this.viewMode = 'form';
        },

        async saveOrg() {
            let payload = { ...this.formOrg };
            let orgId = payload.id;
            delete payload.id;

            if (this.contactMode === 'new' && this.newContact.first_name && this.newContact.last_name) {
                let personPayload = { ...this.newContact, organization_id: orgId || null };
                let newPerson = await db.savePerson(personPayload, null);
                if (newPerson) payload.primary_contact_id = newPerson.id;
            } else if (!payload.primary_contact_id) {
                payload.primary_contact_id = null;
            }

            if (orgId) {
                await db.saveOrganization(payload, orgId);
                if (this.contactMode === 'new' && payload.primary_contact_id) {
                    await db.savePerson({ organization_id: orgId }, payload.primary_contact_id);
                }
                this.selectedOrgId = orgId;
            } else {
                let savedOrg = await db.saveOrganization(payload, null);
                if (savedOrg) {
                    this.selectedOrgId = savedOrg.id;
                    if (this.contactMode === 'new' && payload.primary_contact_id) {
                        await db.savePerson({ organization_id: savedOrg.id }, payload.primary_contact_id);
                    }
                }
            }
            await this.loadData();
            this.viewMode = 'detail';
        },

        async deleteOrg(id) {
            if (confirm("Delete this organization?")) {
                await db.deleteOrganization(id);
                await this.loadData();
                this.viewMode = 'list';
            }
        },

        // --- PEOPLE CRUD ---
        openPersonForm() {
            this.formPerson = { first_name: '', last_name: '', role: '', email: '', phone: '', organization_id: null };
            this.viewMode = 'form';
            this.pushState();
        },

        openPersonFormWithOrg(orgId) {
            this.formPerson = { first_name: '', last_name: '', role: '', email: '', phone: '', organization_id: orgId };
            this.viewMode = 'form';
        },

        editPerson(p) {
            this.formPerson = { ...p };
            this.viewMode = 'form';
        },

        async savePerson() {
            let payload = { ...this.formPerson };
            let personId = payload.id;
            delete payload.id;
            if (!payload.organization_id) payload.organization_id = null;

            let savedPerson = await db.savePerson(payload, personId);
            if (savedPerson) this.selectedPersonId = savedPerson.id;
            await this.loadData();
            this.viewMode = 'detail';
        },

        async deletePerson(id) {
            if (confirm("Delete this person?")) {
                await db.deletePerson(id);
                await this.loadData();
                this.viewMode = 'list';
            }
        },

        // --- INTERACTIONS CRUD & PREPOPULATION ---
        getNowIsoLocal() {
            let now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            return now.toISOString().slice(0, 16);
        },

        openInteractionForm() {
            this.formInteraction = { 
                medium: 'call', 
                status: 'completed',
                interaction_date: this.getNowIsoLocal(), 
                organization_id: null, 
                assigned_to: this.currentPerson ? this.currentPerson.id : '', 
                people_ids: [], 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
            this.pushState();
        },

        openInteractionFormForOrg(orgId) {
            let peopleIdsForOrg = this.getPeopleForOrg(orgId).map(p => p.id);
            this.formInteraction = { 
                medium: 'call', 
                status: 'completed',
                interaction_date: this.getNowIsoLocal(), 
                organization_id: orgId, 
                assigned_to: this.currentPerson ? this.currentPerson.id : '',
                people_ids: peopleIdsForOrg, 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
            this.pushState();
        },

        openInteractionFormForPerson(person) {
            this.formInteraction = { 
                medium: 'call', 
                status: 'completed',
                interaction_date: this.getNowIsoLocal(), 
                organization_id: person.organization_id || null, 
                assigned_to: this.currentPerson ? this.currentPerson.id : '',
                people_ids: [person.id], 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
            this.pushState();
        },

        editInteraction(item) {
            let d = new Date(item.interaction_date || item.due_date);
            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
            let isoString = d.toISOString().slice(0, 16);

            this.formInteraction = { ...item, interaction_date: isoString, people_ids: item.people_ids || [] };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
        },

        onOrgChangeInForm() {
            if (!this.formInteraction.organization_id) return;
            let validPeople = this.getFilteredPeopleForForm().map(p => p.id);
            this.formInteraction.people_ids = this.formInteraction.people_ids.filter(id => validPeople.includes(id));
        },

        getFilteredPeopleForForm() {
            if (!this.formInteraction.organization_id) return this.people;
            return this.people.filter(p => p.organization_id === this.formInteraction.organization_id);
        },

        async saveInteraction() {
            let payload = { ...this.formInteraction };
            let interactionId = payload.id;
            delete payload.id;
            if (!payload.organization_id) payload.organization_id = null;
            if (!payload.assigned_to) payload.assigned_to = null;
            payload.interaction_date = new Date(payload.interaction_date).toISOString();

            let saved = await db.saveInteraction(payload, interactionId);
            if (saved) this.selectedInteractionId = saved.id;
            await this.loadData();
            this.activeTab = 'interactions';
            this.viewMode = 'detail';
        }
    }));
});
