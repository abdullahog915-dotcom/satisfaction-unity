/* ============================================================
   BANNER SERVICE
   Fetch banner/hero slider data from Supabase
============================================================= */

const BannerService = {
  /**
   * Get all active banners
   * @returns {Promise<Array>} Array of banner slides
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('banners')
        .select('*')
        .eq('status', 'active')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Transform to match legacy format
      return {
        slides: data.map(banner => ({
          type: banner.type,
          image: banner.type === 'image' ? banner.public_url : null,
          video: banner.type === 'video' ? banner.public_url : null,
          title: banner.title,
          subtitle: banner.subtitle,
          cta_text: banner.cta_text,
          cta_link: banner.cta_link
        }))
      };
    } catch (error) {
      console.error('Failed to fetch banners:', error);
      return { slides: [] };
    }
  }
};

// Export for global access
window.BannerService = BannerService;
