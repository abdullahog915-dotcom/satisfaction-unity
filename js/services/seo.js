/* ============================================================
   SEO SERVICE
   Fetch SEO metadata from Supabase
============================================================= */

const SEOService = {
  /**
   * Get SEO data for a specific page
   * @param {string} pageSlug - Page identifier (home, products, about, contact)
   * @returns {Promise<Object|null>} SEO data or null
   */
  async getByPage(pageSlug) {
    try {
      const { data, error } = await supabaseClient
        .from('seo_pages')
        .select('*')
        .eq('page_slug', pageSlug)
        .single();

      if (error) throw error;

      return {
        metaTitle: data.meta_title,
        metaDescription: data.meta_description,
        ogTitle: data.og_title,
        ogDescription: data.og_description,
        ogImage: data.og_image_url,
        canonicalUrl: data.canonical_url,
        schemaType: data.schema_type,
        schemaData: data.schema_data
      };
    } catch (error) {
      console.error('Failed to fetch SEO data:', error);
      return null;
    }
  },

  /**
   * Get all SEO pages (for migration/admin purposes)
   * @returns {Promise<Object>} SEO data keyed by page slug
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('seo_pages')
        .select('*');

      if (error) throw error;

      const seoData = {};
      data.forEach(page => {
        seoData[page.page_slug] = {
          metaTitle: page.meta_title,
          metaDescription: page.meta_description,
          ogTitle: page.og_title,
          ogDescription: page.og_description,
          ogImage: page.og_image_url,
          canonicalUrl: page.canonical_url,
          schemaType: page.schema_type,
          schemaData: page.schema_data
        };
      });

      return seoData;
    } catch (error) {
      console.error('Failed to fetch all SEO data:', error);
      return {};
    }
  }
};

// Export for global access
window.SEOService = SEOService;
