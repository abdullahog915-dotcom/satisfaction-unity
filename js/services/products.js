/* ============================================================
   PRODUCT SERVICE
   Fetch product data from Supabase
============================================================= */

const ProductService = {
  /**
   * Get all published products with their images and category
   * @returns {Promise<Array>} Array of products
   */
  async getAll() {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug),
          images:product_images(id, public_url, alt_text, sort_order, is_primary)
        `)
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Products loaded from SUPABASE:', data.length, 'products');
      
      // Transform data to match existing format
      return data.map(product => this.transformProduct(product));
    } catch (error) {
      console.error('❌ Failed to fetch from SUPABASE:', error);
      return [];
    }
  },

  /**
   * Get product by slug
   * @param {string} slug - Product slug (e.g., 'lamp-01')
   * @returns {Promise<Object|null>} Product object or null
   */
  async getBySlug(slug) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug),
          images:product_images(id, public_url, alt_text, sort_order, is_primary)
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      return this.transformProduct(data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return null;
    }
  },

  /**
   * Get products by category
   * @param {string} categorySlug - Category slug
   * @returns {Promise<Array>} Array of products
   */
  async getByCategory(categorySlug) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select(`
          *,
          category:categories!inner(id, name, slug),
          images:product_images(id, public_url, alt_text, sort_order, is_primary)
        `)
        .eq('category.slug', categorySlug)
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data.map(product => this.transformProduct(product));
    } catch (error) {
      console.error('Failed to fetch products by category:', error);
      return [];
    }
  },

  /**
   * Get featured products
   * @param {number} limit - Number of products to return
   * @returns {Promise<Array>} Array of products
   */
  async getFeatured(limit = 6) {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select(`
          *,
          category:categories(id, name, slug),
          images:product_images(id, public_url, alt_text, sort_order, is_primary)
        `)
        .eq('status', 'published')
        .eq('featured', true)
        .order('sort_order', { ascending: true })
        .limit(limit);

      if (error) throw error;

      return data.map(product => this.transformProduct(product));
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
      return [];
    }
  },

  /**
   * Transform Supabase product data to match legacy JSON format
   * @param {Object} product - Raw product from Supabase
   * @returns {Object} Transformed product
   */
  transformProduct(product) {
    // Sort images by sort_order
    const sortedImages = (product.images || [])
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

    return {
      id: product.slug,
      databaseId: product.id,
      name: product.name,
      category: product.category?.name || '',
      categorySlug: product.category?.slug || '',
      price: product.price,
      description: product.description || '',
      images: sortedImages.map(img => img.public_url),
      imageAlts: sortedImages.map(img => img.alt_text || product.image_alt || product.name),
      material: product.material || 'metal',
      inStock: product.in_stock,
      featured: product.featured,
      sortOrder: product.sort_order,
      imageRecords: sortedImages,
      seo: {
        metaTitle: product.meta_title,
        metaDescription: product.meta_description,
        imageAlt: product.image_alt || sortedImages[0]?.alt_text || product.name
      }
    };
  }
};

// Export for global access
window.ProductService = ProductService;
