export const db = {
    client: null,

    init(url, key) {
        if (!url || !key) return null;
        this.client = supabase.createClient(url, key);
        return this.client;
    },

    async fetchAll() {
        if (!this.client) return { orgs: [], people: [], interactions: [] };
        let [oRes, pRes, iRes] = await Promise.all([
            this.client.from('organizations').select('*').order('name'),
            this.client.from('people').select('*').order('first_name'),
            this.client.from('interactions').select('*').order('interaction_date', { ascending: false })
        ]);
        return {
            orgs: oRes.data || [],
            people: pRes.data || [],
            interactions: iRes.data || []
        };
    },

    async save(table, payload, idField = 'id') {
        let dataToSave = { ...payload };
        let id = dataToSave[idField];
        delete dataToSave[idField];

        if (id) {
            let { data, error } = await this.client.from(table).update(dataToSave).eq(idField, id).select();
            return error ? null : (data[0] || { id });
        } else {
            let { data, error } = await this.client.from(table).insert([dataToSave]).select();
            return error ? null : data[0];
        }
    },

    async remove(table, id) {
        let { error } = await this.client.from(table).delete().eq('id', id);
        return !error;
    }
};
