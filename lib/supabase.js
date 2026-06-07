import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let originalSupabase;

if (supabaseUrl && supabaseAnonKey) {
  originalSupabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn(
    'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );

  const mockResponse = { data: null, error: { message: 'Supabase not configured. Update .env.local with your Supabase credentials.' } };
  const mockQuery = () => ({
    select: () => mockQuery(),
    insert: () => mockQuery(),
    update: () => mockQuery(),
    delete: () => mockQuery(),
    eq: () => mockQuery(),
    order: () => mockQuery(),
    single: () => Promise.resolve(mockResponse),
    then: (resolve) => resolve(mockResponse),
  });

  originalSupabase = {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve(mockResponse),
      signInWithPassword: () => Promise.resolve(mockResponse),
      signOut: () => Promise.resolve({ error: null }),
    },
    from: () => mockQuery(),
  };
}

// Guest store and query builder for "No-storage/offline" mode
let guestStore = {
  projects: [],
  episodes: [],
  acts: [],
  elements: []
};

const loadGuestStore = () => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem('fauxpas_guest_store');
    if (data) {
      try {
        guestStore = JSON.parse(data);
      } catch (e) {
        console.error('Error parsing guest store:', e);
      }
    }
  }
};

const saveGuestStore = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('fauxpas_guest_store', JSON.stringify(guestStore));
  }
};

class GuestQueryBuilder {
  constructor(table) {
    this.table = table;
    loadGuestStore();
    if (!guestStore[table]) {
      guestStore[table] = [];
    }
    this.list = [...guestStore[table]];
    this.filters = [];
    this.operation = 'select';
    this.opData = null;
    this.sortField = null;
    this.sortAscending = true;
    this.isSingle = false;
  }

  select(fields) {
    if (this.operation !== 'insert' && this.operation !== 'update') {
      this.operation = 'select';
    }
    return this;
  }

  insert(data) {
    this.operation = 'insert';
    this.opData = data;
    return this;
  }

  update(data) {
    this.operation = 'update';
    this.opData = data;
    return this;
  }

  delete() {
    this.operation = 'delete';
    return this;
  }

  eq(field, value) {
    this.filters.push({ field, value });
    return this;
  }

  order(field, options = {}) {
    this.sortField = field;
    this.sortAscending = options.ascending !== false;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  then(resolve, reject) {
    try {
      const result = this.execute();
      return Promise.resolve(result).then(resolve, reject);
    } catch (err) {
      return Promise.reject(err).catch(reject);
    }
  }

  execute() {
    let filteredList = [...this.list];
    if (this.filters.length > 0) {
      filteredList = filteredList.filter(item => {
        return this.filters.every(f => item[f.field] === f.value);
      });
    }

    let resultData = null;

    if (this.operation === 'select') {
      resultData = filteredList;
    } else if (this.operation === 'insert') {
      const newItems = Array.isArray(this.opData) ? this.opData : [this.opData];
      const inserted = newItems.map(item => {
        const newItem = {
          id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
          created_at: item.created_at || new Date().toISOString(),
          updated_at: item.updated_at || new Date().toISOString(),
          ...item
        };
        guestStore[this.table].push(newItem);
        return newItem;
      });
      saveGuestStore();
      resultData = Array.isArray(this.opData) ? inserted : inserted[0];
    } else if (this.operation === 'update') {
      const updated = [];
      guestStore[this.table] = guestStore[this.table].map(item => {
        const matches = this.filters.every(f => item[f.field] === f.value);
        if (matches) {
          const updatedItem = {
            ...item,
            ...this.opData,
            updated_at: new Date().toISOString()
          };
          updated.push(updatedItem);
          return updatedItem;
        }
        return item;
      });
      saveGuestStore();
      resultData = updated;
    } else if (this.operation === 'delete') {
      const remaining = [];
      const deleted = [];
      guestStore[this.table].forEach(item => {
        const matches = this.filters.every(f => item[f.field] === f.value);
        if (matches) {
          deleted.push(item);
        } else {
          remaining.push(item);
        }
      });
      guestStore[this.table] = remaining;

      // Implement cascade delete for guest mode local storage
      if (deleted.length > 0) {
        const deletedIds = deleted.map(d => d.id);
        if (this.table === 'projects') {
          // Cascade: Projects -> Episodes
          const remainingEpisodes = [];
          const deletedEpisodes = [];
          guestStore.episodes.forEach(ep => {
            if (deletedIds.includes(ep.project_id)) {
              deletedEpisodes.push(ep);
            } else {
              remainingEpisodes.push(ep);
            }
          });
          guestStore.episodes = remainingEpisodes;

          // Cascade: Episodes -> Acts
          if (deletedEpisodes.length > 0) {
            const deletedEpIds = deletedEpisodes.map(e => e.id);
            const remainingActs = [];
            const deletedActs = [];
            guestStore.acts.forEach(act => {
              if (deletedEpIds.includes(act.episode_id)) {
                deletedActs.push(act);
              } else {
                remainingActs.push(act);
              }
            });
            guestStore.acts = remainingActs;

            // Cascade: Acts -> Elements
            if (deletedActs.length > 0) {
              const deletedActIds = deletedActs.map(a => a.id);
              guestStore.elements = guestStore.elements.filter(el => !deletedActIds.includes(el.act_id));
            }
          }
        } else if (this.table === 'episodes') {
          // Cascade: Episodes -> Acts
          const remainingActs = [];
          const deletedActs = [];
          guestStore.acts.forEach(act => {
            if (deletedIds.includes(act.episode_id)) {
              deletedActs.push(act);
            } else {
              remainingActs.push(act);
            }
          });
          guestStore.acts = remainingActs;

          // Cascade: Acts -> Elements
          if (deletedActs.length > 0) {
            const deletedActIds = deletedActs.map(a => a.id);
            guestStore.elements = guestStore.elements.filter(el => !deletedActIds.includes(el.act_id));
          }
        } else if (this.table === 'acts') {
          // Cascade: Acts -> Elements
          guestStore.elements = guestStore.elements.filter(el => !deletedIds.includes(el.act_id));
        }
      }

      saveGuestStore();
      resultData = deleted;
    }

    if (this.sortField && Array.isArray(resultData)) {
      resultData.sort((a, b) => {
        const valA = a[this.sortField];
        const valB = b[this.sortField];
        if (valA < valB) return this.sortAscending ? -1 : 1;
        if (valA > valB) return this.sortAscending ? 1 : -1;
        return 0;
      });
    }

    if (this.isSingle) {
      resultData = Array.isArray(resultData) ? resultData[0] || null : resultData;
    }

    return { data: resultData, error: null };
  }
}

const isGuestMode = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('fauxpas_guest_mode') === 'true';
  }
  return false;
};

const supabase = {
  auth: {
    getUser: () => {
      if (isGuestMode()) {
        return Promise.resolve({
          data: {
            user: {
              id: 'guest-user-id',
              email: 'guest@fauxpas.local',
              user_metadata: { username: 'Guest Mode (No data saved)' },
            }
          },
          error: null
        });
      }
      return originalSupabase.auth.getUser();
    },
    signUp: (credentials) => {
      return originalSupabase.auth.signUp(credentials);
    },
    signInWithPassword: (credentials) => {
      return originalSupabase.auth.signInWithPassword(credentials);
    },
    signOut: () => {
      if (isGuestMode()) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fauxpas_guest_mode');
          localStorage.removeItem('fauxpas_guest_store');
        }
        return Promise.resolve({ error: null });
      }
      return originalSupabase.auth.signOut();
    }
  },
  from: (table) => {
    if (isGuestMode()) {
      return new GuestQueryBuilder(table);
    }
    return originalSupabase.from(table);
  }
};

export { supabase };
