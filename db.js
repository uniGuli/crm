// Supabase Configuration (Replace with your actual Supabase project URL and Anon Key)
const SUPABASE_URL = 'https://sgbihdmqxsqkxqyfymfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6a9xMhEmOQ4o-wDfs-oCcQ_g9qbQjXg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export const db = {
    client: supabaseClient,

    async getSession() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        return session;
    },

    async signIn(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    },

    async signUp(email, password) {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
    },

    onAuthStateChange(callback) {
        return supabaseClient.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    async getCurrentPersonProfile(userEmail) {
        if (!userEmail) return null;
        const { data, error } = await supabaseClient
            .from('people')
            .select('*')
            .eq('email', userEmail)
            .single();
        if (error) return null;
        return data;
    },

    async fetchAll() {
        const [oRes, pRes, iRes] = await Promise.all([
            supabaseClient.from('organizations').select('*').order('name'),
            supabaseClient.from('people').select('*').order('first_name'),
            supabaseClient.from('interactions').select('*').order('interaction_date', { ascending: false })
        ]);
        return {
            orgs: oRes.data || [],
            people: pRes.data || [],
            interactions: iRes.data || []
        };
    },

    async saveOrganization(payload, id) {
        if (id) {
            const { data, error } = await supabaseClient.from('organizations').update(payload).eq('id', id).select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await supabaseClient.from('organizations').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }
    },

    async deleteOrganization(id) {
        const { error } = await supabaseClient.from('organizations').delete().eq('id', id);
        if (error) throw error;
    },

    async savePerson(payload, id) {
        if (id) {
            const { data, error } = await supabaseClient.from('people').update(payload).eq('id', id).select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await supabaseClient.from('people').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }
    },

    async deletePerson(id) {
        const { error } = await supabaseClient.from('people').delete().eq('id', id);
        if (error) throw error;
    },

    async saveInteraction(payload, id) {
        if (id) {
            const { data, error } = await supabaseClient.from('interactions').update(payload).eq('id', id).select();
            if (error) throw error;
            return data[0];
        } else {
            const { data, error } = await supabaseClient.from('interactions').insert([payload]).select();
            if (error) throw error;
            return data[0];
        }
    }
};
