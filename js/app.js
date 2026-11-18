import { db } from './db.js';

window.crmApp = function() {
    return {
        activeTab: 'orgs',
        viewMode: 'list',
        showConfig: false,
        supabaseUrl: localStorage.getItem('sb_url') || '',
        supabaseKey: localStorage.getItem('sb_key') || '',
        currentUserId: localStorage.getItem('sb_current_user') || '',
        
        orgs: [],
        people: [],
        interactions: [],

        // Search, Filters & Sorting
        orgSearch: '',
        orgStatusFilter: '',
        orgSortBy: 'name-asc',
        peopleSearch: '',
        interactionFilter: 'completed',

        selectedOrgId: null,
        selectedPersonId: null,
        selectedInteractionId: null,

        formOrg: {},
        formPerson: {},
        formInteraction: {},

        async init() {
            if (this.supabaseUrl && this.supabaseKey) {
                db.init(this.supabaseUrl, this.supabaseKey);
                await this.refreshData();
            }
        },

        async refreshData() {
            let data = await db.fetchAll();
            this.orgs = data.orgs;
            this.people = data.people;
            this.interactions = data.interactions;
        },

        saveConfig() {
            localStorage.setItem('sb_url', this.supabaseUrl);
            localStorage.setItem('sb_key', this.supabaseKey);
            localStorage.setItem('sb_current_user', this.currentUserId);
            db.init(this.supabaseUrl, this.supabaseKey);
            this.refreshData();
            this.showConfig = false;
        },

        goToTab(tab) {
            this.activeTab = tab;
            this.viewMode = 'list';
        },

        getStatusBadgeClass(status) {
            switch(status) {
                case 'partner': 
                case 'completed': return 'bg-green-100 text-green-700';
                case 'contact': 
                case 'upcoming': return 'bg-indigo-100 text-indigo-700';
                case 'poor fit': 
                case 'overdue': return 'bg-red-100 text-red-700';
                case 'unresponsive': return 'bg-yellow-100 text-yellow-700';
                case 'archived': return 'bg-gray-200 text-gray-600';
                default: return 'bg-purple-100 text-purple-700';
            }
        },

        // --- COMPUTED FILTERS & SORTING ---
        get filteredOrgs() {
            let result = [...this.orgs];
            if (this.orgSearch.trim()) {
                let q = this.orgSearch.toLowerCase();
                result = result.filter(o => 
                    (o.name && o.name.toLowerCase().includes(q)) || 
                    (o.description && o.description.toLowerCase().includes(q)) ||
                    (o.website && o.website.toLowerCase().includes(q))
                );
            }
            if (this.orgStatusFilter) {
                result = result.filter(o => (o.status || 'research') === this.orgStatusFilter);
            }
            result.sort((a, b) => {
                if (this.orgSortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
                if (this.orgSortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
                if (this.orgSortBy === 'status') return (a.status || 'research').localeCompare(b.status || 'research');
                return 0;
            });
            return result;
        },

        get filteredPeople() {
            let result = [...this.people];
            if (this.peopleSearch.trim()) {
                let q = this.peopleSearch.toLowerCase();
                result = result.filter(p => 
                    (p.first_name && p.first_name.toLowerCase().includes(q)) || 
                    (p.last_name && p.last_name.toLowerCase().includes(q)) ||
                    (p.email && p.email.toLowerCase().includes(q)) ||
                    (p.role && p.role.toLowerCase().includes(q))
                );
            }
            return result;
        },

        get filteredInteractions() {
            return this.interactions.filter(i => (i.status || 'completed') === this.interactionFilter);
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

        // --- NAVIGATION HELPERS ---
        viewOrgDetail(id) {
            this.activeTab = 'orgs';
            this.selectedOrgId = id;
            this.viewMode = 'detail';
        },

        viewPersonDetail(id) {
            this.activeTab = 'people';
            this.selectedPersonId = id;
            this.viewMode = 'detail';
        },

        viewInteractionDetail(id) {
            this.activeTab = 'interactions';
            this.selectedInteractionId = id;
            this.viewMode = 'detail';
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
            this.formOrg = { name: '', status: 'research', description: '', website: '', phone: '', primary_contact_id: null, misc: '' };
            this.viewMode = 'form';
        },

        editOrg(org) {
            this.formOrg = { ...org };
            this.viewMode = 'form';
        },

        async saveOrg() {
            let payload = { ...this.formOrg };
            if (!payload.primary_contact_id) payload.primary_contact_id = null;
            let saved = await db.save('organizations', payload);
            if (saved) {
                this.selectedOrgId = saved.id;
                await this.refreshData();
                this.viewMode = 'detail';
            }
        },

        async deleteOrg(id) {
            if (confirm("Delete this organization?")) {
                await db.remove('organizations', id);
                await this.refreshData();
                this.viewMode = 'list';
            }
        },

        // --- PEOPLE CRUD ---
        openPersonForm() {
            this.formPerson = { first_name: '', last_name: '', role: '', email: '', phone: '', organization_id: null };
            this.viewMode = 'form';
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
            if (!payload.organization_id) payload.organization_id = null;
            let saved = await db.save('people', payload);
            if (saved) {
                this.selectedPersonId = saved.id;
                await this.refreshData();
                this.viewMode = 'detail';
            }
        },

        async deletePerson(id) {
            if (confirm("Delete this person?")) {
                await db.remove('people', id);
                await this.refreshData();
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
                assigned_to: this.currentUserId || '', 
                people_ids: [], 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
        },

        openInteractionFormForOrg(orgId) {
            let peopleIdsForOrg = this.getPeopleForOrg(orgId).map(p => p.id);
            this.formInteraction = { 
                medium: 'call', 
                status: 'completed',
                interaction_date: this.getNowIsoLocal(), 
                organization_id: orgId, 
                assigned_to: this.currentUserId || '',
                people_ids: peopleIdsForOrg, 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
        },

        openInteractionFormForPerson(person) {
            this.formInteraction = { 
                medium: 'call', 
                status: 'completed',
                interaction_date: this.getNowIsoLocal(), 
                organization_id: person.organization_id || null, 
                assigned_to: this.currentUserId || '',
                people_ids: [person.id], 
                notes: '' 
            };
            this.activeTab = 'interactions';
            this.viewMode = 'form';
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
            if (!payload.organization_id) payload.organization_id = null;
            if (!payload.assigned_to) payload.assigned_to = null;
            payload.interaction_date = new Date(payload.interaction_date).toISOString();

            let saved = await db.save('interactions', payload);
            if (saved) {
                this.selectedInteractionId = saved.id;
                await this.refreshData();
                this.activeTab = 'interactions';
                this.viewMode = 'detail';
            }
        }
    };
};
