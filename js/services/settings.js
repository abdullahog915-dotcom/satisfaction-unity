/* ============================================================
   SETTINGS SERVICE
   Fetch site settings from Supabase
============================================================= */

const SettingsService = {
  /**
   * Get all site settings
   * @returns {Promise<Object>} Settings object keyed by setting key
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('site_settings')
        .select('*');

      if (error) throw error;

      const settings = {};
      data.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      return settings;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return {};
    }
  },

  /**
   * Get a specific setting by key
   * @param {string} key - Setting key
   * @returns {Promise<string|null>} Setting value or null
   */
  async get(key) {
    try {
      const { data, error } = await supabaseClient
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) throw error;

      return data.value;
    } catch (error) {
      console.error('Failed to fetch setting:', error);
      return null;
    }
  },

  /**
   * Get settings by category
   * @param {string} category - Setting category
   * @returns {Promise<Object>} Settings object
   */
  async getByCategory(category) {
    try {
      const { data, error } = await supabaseClient
        .from('site_settings')
        .select('*')
        .eq('category', category);

      if (error) throw error;

      const settings = {};
      data.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      return settings;
    } catch (error) {
      console.error('Failed to fetch settings by category:', error);
      return {};
    }
  }
};

// Export for global access
window.SettingsService = SettingsService;
