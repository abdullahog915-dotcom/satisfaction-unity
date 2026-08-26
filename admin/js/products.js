(function () {
  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  let products = [];
  let categories = [];

  const productSelect = '*,category:categories(id,name,slug),images:product_images(id,storage_path,public_url,alt_text,sort_order,is_primary)';

  async function load() {
    const [productResult, categoryResult] = await Promise.all([
      supabaseClient.from('products').select(productSelect).order('sort_order').order('created_at', { ascending: false }),
      supabaseClient.from('categories').select('*').order('sort_order'),
    ]);
    if (productResult.error) throw productResult.error;
    if (categoryResult.error) throw categoryResult.error;
    products = productResult.data;
    categories = categoryResult.data;
  }

  function orderedImages(images = []) {
    return [...images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(b.is_primary) - Number(a.is_primary));
  }

  function table(items) {
    if (!items.length) return '<div class="panel empty">No products found.</div>';
    return `<div class="panel"><table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.map((product) => {
      const image = orderedImages(product.images)[0];
      return `<tr><td><div style="display:flex;gap:12px;align-items:center">${image ? `<img src="${AdminUI.escape(image.public_url)}" alt="">` : ''}<div><strong>${AdminUI.escape(product.name)}</strong><br><small class="muted">/${AdminUI.escape(product.slug)}${product.featured ? ' · Featured' : ''}</small></div></div></td><td>${AdminUI.escape(product.category?.name || 'Unassigned')}</td><td>₹${Number(product.price).toLocaleString('en-IN')}</td><td>${product.in_stock ? 'In stock' : 'Out of stock'}</td><td><span class="badge ${product.status}">${product.status}</span></td><td><div class="actions"><button class="button secondary" data-edit="${product.id}">Edit</button><button class="button danger" data-delete="${product.id}">Delete</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }

  async function render() {
    await load();
    AdminUI.content().innerHTML = `<div class="toolbar"><div class="filters"><input id="product-search" type="search" placeholder="Search products"><select id="product-category-filter"><option value="">All categories</option>${categories.map((category) => `<option value="${category.id}">${AdminUI.escape(category.name)}</option>`).join('')}</select></div><button id="add-product" class="button primary">Add product</button></div><div id="product-table">${table(products)}</div>`;
    document.getElementById('add-product').addEventListener('click', () => form());
    const refresh = () => {
      const search = document.getElementById('product-search').value.toLowerCase();
      const category = document.getElementById('product-category-filter').value;
      document.getElementById('product-table').innerHTML = table(products.filter((product) => (!category || product.category_id === category) && (!search || `${product.name} ${product.slug} ${product.description || ''}`.toLowerCase().includes(search))));
      bindRows();
    };
    document.getElementById('product-search').addEventListener('input', refresh);
    document.getElementById('product-category-filter').addEventListener('change', refresh);
    bindRows();
  }

  function bindRows() {
    document.querySelectorAll('[data-edit]').forEach((button) => button.addEventListener('click', () => form(products.find((product) => product.id === button.dataset.edit))));
    document.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', () => removeProduct(products.find((product) => product.id === button.dataset.delete))));
  }

  function initialImageState(product) {
    const images = orderedImages(product?.images || []);
    return images.map((image, index) => ({
      key: image.id,
      id: image.id,
      file: null,
      existingUrl: image.public_url,
      previewUrl: image.public_url,
      ownsPreviewUrl: false,
      altText: image.alt_text || product?.image_alt || product?.name || '',
      sortOrder: index,
      isExisting: true,
      isReplacement: false,
      storagePath: image.storage_path,
    }));
  }

  function normalizeImageOrder(imageState) {
    imageState.items.forEach((item, index) => { item.sortOrder = index; });
  }

  function releasePreview(item) {
    if (item?.ownsPreviewUrl && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    if (item) item.ownsPreviewUrl = false;
  }

  function releaseAllPreviews(imageState) {
    imageState.items.forEach(releasePreview);
  }

  function validateImageFile(file) {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE) {
      throw new Error(`${file.name} must be JPG, PNG or WebP and 5 MB or smaller.`);
    }
  }

  function imageCard(item, index, imageCount) {
    const isMain = index === 0;
    const status = item.isReplacement ? 'Replacement selected' : item.isExisting ? 'Saved image' : 'New image';
    return `<article class="image-card ${isMain ? 'is-main' : ''}" data-image-key="${AdminUI.escape(item.key)}">
      <div class="image-card-preview"><img src="${AdminUI.escape(item.previewUrl)}" alt="${AdminUI.escape(item.altText || 'Product image preview')}">${isMain ? '<span class="image-main-badge">MAIN</span>' : ''}</div>
      <div class="image-card-fields"><div class="image-card-heading"><strong>Image ${index + 1}</strong><span class="muted">${status}</span></div><label>Sort order<input data-image-field="sort-order" type="number" min="0" max="${Math.max(0, imageCount - 1)}" step="1" value="${index}" inputmode="numeric"></label><label>Alt text<input data-image-field="alt-text" value="${AdminUI.escape(item.altText)}" placeholder="Describe this product image"></label></div>
      <div class="image-card-actions"><button type="button" class="button secondary" data-image-action="set-main" ${isMain ? 'disabled' : ''}>${isMain ? 'Main image' : 'Set as main'}</button><button type="button" class="button secondary" data-image-action="replace">Replace image</button><button type="button" class="button danger" data-image-action="remove">Remove</button><input class="hidden" data-image-replacement type="file" accept="image/jpeg,image/png,image/webp"></div>
    </article>`;
  }

  function renderImageCards(imageState) {
    normalizeImageOrder(imageState);
    imageState.listNode.innerHTML = imageState.items.length
      ? imageState.items.map((item, index) => imageCard(item, index, imageState.items.length)).join('')
      : '<div class="image-empty muted">No product images selected yet.</div>';
  }

  function moveImage(imageState, key, requestedOrder) {
    const currentIndex = imageState.items.findIndex((item) => item.key === key);
    if (currentIndex < 0) return;
    const numericOrder = Number(requestedOrder);
    if (!Number.isInteger(numericOrder)) {
      renderImageCards(imageState);
      AdminUI.toast('Sort order must be a whole number.', 'error');
      return;
    }
    const targetIndex = Math.max(0, Math.min(imageState.items.length - 1, numericOrder));
    const [item] = imageState.items.splice(currentIndex, 1);
    imageState.items.splice(targetIndex, 0, item);
    renderImageCards(imageState);
  }

  function bindImageManager(formNode, imageState) {
    const addInput = formNode.elements.add_images;
    addInput.addEventListener('change', () => {
      const files = [...addInput.files];
      try {
        files.forEach(validateImageFile);
        const defaultAlt = formNode.elements.image_alt.value.trim() || formNode.elements.name.value.trim();
        files.forEach((file) => imageState.items.push({
          key: `draft-${crypto.randomUUID()}`,
          id: null,
          file,
          existingUrl: null,
          previewUrl: URL.createObjectURL(file),
          ownsPreviewUrl: true,
          altText: defaultAlt,
          sortOrder: imageState.items.length,
          isExisting: false,
          isReplacement: false,
          storagePath: null,
        }));
        renderImageCards(imageState);
      } catch (error) {
        AdminUI.toast(error.message, 'error');
      } finally {
        addInput.value = '';
      }
    });

    imageState.listNode.addEventListener('input', (event) => {
      if (event.target.dataset.imageField !== 'alt-text') return;
      const item = imageState.items.find((candidate) => candidate.key === event.target.closest('[data-image-key]')?.dataset.imageKey);
      if (item) item.altText = event.target.value;
    });

    imageState.listNode.addEventListener('change', (event) => {
      const key = event.target.closest('[data-image-key]')?.dataset.imageKey;
      if (!key) return;
      if (event.target.dataset.imageField === 'sort-order') {
        moveImage(imageState, key, event.target.value);
        return;
      }
      if (!event.target.matches('[data-image-replacement]')) return;
      const [file] = event.target.files;
      if (!file) return;
      try {
        validateImageFile(file);
        const item = imageState.items.find((candidate) => candidate.key === key);
        if (!item) return;
        releasePreview(item);
        item.file = file;
        item.previewUrl = URL.createObjectURL(file);
        item.ownsPreviewUrl = true;
        item.isReplacement = item.isExisting;
        renderImageCards(imageState);
      } catch (error) {
        AdminUI.toast(error.message, 'error');
        event.target.value = '';
      }
    });

    imageState.listNode.addEventListener('click', (event) => {
      const button = event.target.closest('[data-image-action]');
      if (!button) return;
      const card = button.closest('[data-image-key]');
      const index = imageState.items.findIndex((item) => item.key === card?.dataset.imageKey);
      if (index < 0) return;
      if (button.dataset.imageAction === 'set-main') {
        const [item] = imageState.items.splice(index, 1);
        imageState.items.unshift(item);
        renderImageCards(imageState);
      } else if (button.dataset.imageAction === 'replace') {
        card.querySelector('[data-image-replacement]').click();
      } else if (button.dataset.imageAction === 'remove') {
        const [removed] = imageState.items.splice(index, 1);
        releasePreview(removed);
        if (removed.isExisting) imageState.removedExisting.push(removed);
        renderImageCards(imageState);
      }
    });
  }

  function form(product = null) {
    AdminUI.openModal(`<h2>${product ? 'Edit' : 'Add'} product</h2><form id="product-form"><div class="form-grid">
      <label>Name<input name="name" required value="${AdminUI.escape(product?.name || '')}"></label><label>Slug<input name="slug" required pattern="[a-z0-9-]+" value="${AdminUI.escape(product?.slug || '')}"></label>
      <label>Category<select name="category_id"><option value="">Unassigned</option>${categories.map((category) => `<option value="${category.id}" ${product?.category_id === category.id ? 'selected' : ''}>${AdminUI.escape(category.name)}</option>`).join('')}</select></label><label>Price (INR)<input name="price" type="number" min="0" step="1" required value="${product?.price ?? ''}"></label>
      <label>Material<input name="material" value="${AdminUI.escape(product?.material || '')}"></label><label>Sort order<input name="sort_order" type="number" value="${product?.sort_order ?? 0}"></label>
      <label>Status<select name="status"><option value="published" ${product?.status === 'published' ? 'selected' : ''}>Published</option><option value="draft" ${product?.status === 'draft' ? 'selected' : ''}>Draft</option><option value="archived" ${product?.status === 'archived' ? 'selected' : ''}>Archived</option></select></label><div class="check-row"><label><input name="in_stock" type="checkbox" ${product?.in_stock !== false ? 'checked' : ''}> In stock</label><label><input name="featured" type="checkbox" ${product?.featured ? 'checked' : ''}> Featured</label></div>
      <label class="span-2">Description<textarea name="description">${AdminUI.escape(product?.description || '')}</textarea></label><label>SEO title<input name="meta_title" value="${AdminUI.escape(product?.meta_title || '')}"></label><label>SEO description<textarea name="meta_description">${AdminUI.escape(product?.meta_description || '')}</textarea></label><label class="span-2">Default image alt text<input name="image_alt" value="${AdminUI.escape(product?.image_alt || '')}"></label>
      <section class="span-2 image-manager"><h3>Images</h3><div class="section-note">JPG, PNG or WebP; maximum 5 MB each. Upload order becomes image order, and the image at sort order 0 is the main image.</div><div id="product-image-list" class="image-list"></div><label class="image-add-control">Add images<input name="add_images" type="file" accept="image/jpeg,image/png,image/webp" multiple></label></section>
    </div><div class="form-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="submit" class="button primary">Save product</button></div></form>`);

    const formNode = document.getElementById('product-form');
    const imageState = {
      items: initialImageState(product),
      removedExisting: [],
      originalRecords: (product?.images || []).map((image) => ({ ...image, product_id: product.id })),
      listNode: document.getElementById('product-image-list'),
    };
    renderImageCards(imageState);
    bindImageManager(formNode, imageState);
    formNode.elements.name.addEventListener('input', () => { if (!product) formNode.elements.slug.value = AdminUI.slugify(formNode.elements.name.value); });

    const modal = document.getElementById('modal');
    let cleanedUp = false;
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      releaseAllPreviews(imageState);
      modal.removeEventListener('click', handleModalClose, true);
    };
    const handleModalClose = (event) => { if (event.target.id === 'modal' || event.target.closest('#modal-close')) cleanup(); };
    modal.addEventListener('click', handleModalClose, true);
    formNode.querySelector('[data-cancel]').addEventListener('click', () => { cleanup(); AdminUI.closeModal(); });
    formNode.addEventListener('submit', (event) => save(event, product, imageState, cleanup));
  }

  async function removeStorageIfUnshared(path, excludingImageId = '') {
    if (!path) return;
    let query = supabaseClient.from('product_images').select('id').eq('storage_path', path);
    if (excludingImageId) query = query.neq('id', excludingImageId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data.length) {
      const { error: storageError } = await supabaseClient.storage.from('product-images').remove([path]);
      if (storageError) throw storageError;
    }
  }

  function productPayload(values) {
    return {
      name: values.get('name').trim(), slug: AdminUI.slugify(values.get('slug')), category_id: values.get('category_id') || null,
      price: Number(values.get('price')), description: values.get('description').trim() || null, material: values.get('material').trim() || null,
      in_stock: values.has('in_stock'), featured: values.has('featured'), status: values.get('status'), sort_order: Number(values.get('sort_order') || 0),
      meta_title: values.get('meta_title').trim() || null, meta_description: values.get('meta_description').trim() || null, image_alt: values.get('image_alt').trim() || null,
    };
  }

  function validateImageState(imageState) {
    const orders = imageState.items.map((item) => Number(item.sortOrder));
    if (orders.some((order) => !Number.isInteger(order))) throw new Error('Every image sort order must be a whole number.');
    if (new Set(orders).size !== orders.length) throw new Error('Image sort orders cannot contain duplicates.');
    if (orders.some((order, index) => order !== index)) throw new Error('Image sort orders must be consecutive, starting at 0.');
    imageState.items.forEach((item) => {
      if (!item.isExisting && !item.file) throw new Error('A newly added image is missing its file. Please select it again.');
      if (item.file) validateImageFile(item.file);
    });
  }

  function imageAlt(item, payload) {
    return item.altText.trim() || payload.image_alt || payload.name;
  }

  async function uploadImage(file, slug) {
    const path = `${slug}/${Date.now()}-${crypto.randomUUID()}-${AdminUI.safeFileName(file.name)}`;
    const { error } = await supabaseClient.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
  }

  async function removeUploadedPaths(paths) {
    if (!paths.length) return;
    const { error } = await supabaseClient.storage.from('product-images').remove(paths);
    if (error) console.error('Could not clean up newly uploaded images:', error);
  }

  async function saveNewProductImages(product, imageState, payload) {
    if (!imageState.items.length) return;
    const uploads = [];
    try {
      for (const item of imageState.items) uploads.push(await uploadImage(item.file, payload.slug));
      const rows = imageState.items.map((item, index) => ({ product_id: product.id, storage_path: uploads[index].path, public_url: uploads[index].publicUrl, alt_text: imageAlt(item, payload), sort_order: index, is_primary: index === 0 }));
      const { error } = await supabaseClient.from('product_images').insert(rows);
      if (error) throw error;
    } catch (error) {
      await removeUploadedPaths(uploads.map((upload) => upload.path));
      throw error;
    }
  }

  async function restoreExistingImages(productId, originalRecords, insertedIds) {
    if (insertedIds.length) {
      const { error } = await supabaseClient.from('product_images').delete().in('id', insertedIds);
      if (error) throw error;
    }
    const { error: clearError } = await supabaseClient.from('product_images').update({ is_primary: false }).eq('product_id', productId);
    if (clearError) throw clearError;
    if (!originalRecords.length) return;
    const restoreRows = originalRecords.map((image) => ({ id: image.id, product_id: productId, storage_path: image.storage_path, public_url: image.public_url, alt_text: image.alt_text, sort_order: image.sort_order, is_primary: false }));
    const { error: restoreError } = await supabaseClient.from('product_images').upsert(restoreRows, { onConflict: 'id' });
    if (restoreError) throw restoreError;
    const originalPrimary = originalRecords.find((image) => image.is_primary);
    if (originalPrimary) {
      const { error } = await supabaseClient.from('product_images').update({ is_primary: true }).eq('id', originalPrimary.id);
      if (error) throw error;
    }
  }

  async function saveExistingProductImages(product, imageState, payload) {
    const uploadedByKey = new Map();
    const insertedIds = [];
    const uploadedPaths = [];
    let databaseChanged = false;
    try {
      for (const item of imageState.items) {
        if (!item.file) continue;
        const upload = await uploadImage(item.file, payload.slug);
        uploadedByKey.set(item.key, upload);
        uploadedPaths.push(upload.path);
      }
      const { error: clearPrimaryError } = await supabaseClient.from('product_images').update({ is_primary: false }).eq('product_id', product.id);
      if (clearPrimaryError) throw clearPrimaryError;
      databaseChanged = true;
      for (const [index, item] of imageState.items.entries()) {
        const upload = uploadedByKey.get(item.key);
        const record = { alt_text: imageAlt(item, payload), sort_order: index, is_primary: false };
        if (upload) {
          record.storage_path = upload.path;
          record.public_url = upload.publicUrl;
        }
        if (item.isExisting) {
          const { error } = await supabaseClient.from('product_images').update(record).eq('id', item.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabaseClient.from('product_images').insert({ ...record, product_id: product.id }).select('id').single();
          if (error) throw error;
          insertedIds.push(data.id);
          item.id = data.id;
        }
      }
      if (imageState.items.length) {
        const { error } = await supabaseClient.from('product_images').update({ is_primary: true, sort_order: 0 }).eq('id', imageState.items[0].id);
        if (error) throw error;
      }
      for (const item of imageState.removedExisting) {
        const { error } = await supabaseClient.from('product_images').delete().eq('id', item.id);
        if (error) throw error;
      }
    } catch (error) {
      let restored = !databaseChanged;
      if (databaseChanged) {
        try {
          await restoreExistingImages(product.id, imageState.originalRecords, insertedIds);
          restored = true;
        } catch (restoreError) {
          console.error('Image recovery failed:', restoreError);
          error.message = `${error.message} Image recovery also failed; please reload before editing again.`;
        }
      }
      if (restored) await removeUploadedPaths(uploadedPaths);
      throw error;
    }

    const obsolete = [
      ...imageState.items.filter((item) => item.isExisting && item.isReplacement).map((item) => ({ path: item.storagePath, id: item.id })),
      ...imageState.removedExisting.map((item) => ({ path: item.storagePath, id: item.id })),
    ];
    let cleanupWarningCount = 0;
    for (const image of obsolete) {
      try { await removeStorageIfUnshared(image.path, image.id); }
      catch (error) { cleanupWarningCount += 1; console.warn('The old image could not be removed from storage:', error); }
    }
    return cleanupWarningCount;
  }

  async function save(event, existing, imageState, cleanup) {
    event.preventDefault();
    const formNode = event.currentTarget;
    const submit = formNode.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      normalizeImageOrder(imageState);
      validateImageState(imageState);
      const payload = productPayload(new FormData(formNode));
      const query = existing ? supabaseClient.from('products').update(payload).eq('id', existing.id) : supabaseClient.from('products').insert(payload);
      const { data: product, error } = await query.select().single();
      if (error) throw error;
      let cleanupWarningCount = 0;
      if (existing) {
        cleanupWarningCount = await saveExistingProductImages(product, imageState, payload);
      } else {
        try { await saveNewProductImages(product, imageState, payload); }
        catch (imageError) {
          const { error: rollbackError } = await supabaseClient.from('products').delete().eq('id', product.id);
          if (rollbackError) console.error('Could not roll back the new product:', rollbackError);
          throw imageError;
        }
      }
      cleanup();
      AdminUI.closeModal();
      AdminUI.toast(cleanupWarningCount ? 'Product saved, but an old storage file could not be removed.' : 'Product saved.');
      await render();
    } catch (error) {
      AdminUI.toast(error.message, 'error');
      submit.disabled = false;
    }
  }

  async function removeProduct(product) {
    if (!await AdminUI.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try {
      const images = product.images || [];
      const { error } = await supabaseClient.from('products').delete().eq('id', product.id);
      if (error) throw error;
      for (const image of images) await removeStorageIfUnshared(image.storage_path, image.id);
      AdminUI.toast('Product deleted.');
      await render();
    } catch (error) { AdminUI.toast(error.message, 'error'); }
  }

  window.AdminModules = window.AdminModules || {};
  window.AdminModules.products = { render };
})();
