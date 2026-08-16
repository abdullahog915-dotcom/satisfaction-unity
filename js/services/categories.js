/* ============================================================
   CATEGORY SERVICE
   Fetch category data from Supabase
============================================================= */

const CategoryService = {
  /**
   * Get all active categories
   * @returns {Promise<Array>} Array of categories
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return [];
    }
  },

  /**
   * Get category by slug
   * @param {string} slug - Category slug
   * @returns {Promise<Object|null>} Category object or null
   */
  async getBySlug(slug) {
    try {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Failed to fetch category:', error);
      return null;
    }
  }
};

// Export for global access
window.CategoryService = CategoryService;
