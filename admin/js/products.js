(function () {
  let products = [], categories = [];
  const productSelect = '*,category:categories(id,name,slug),images:product_images(id,storage_path,public_url,alt_text,sort_order,is_primary)';
  async function load() {
    const [productResult, categoryResult] = await Promise.all([
      supabaseClient.from('products').select(productSelect).order('sort_order').order('created_at', { ascending: false }),
      supabaseClient.from('categories').select('*').order('sort_order'),
    ]);
    if (productResult.error) throw productResult.error; if (categoryResult.error) throw categoryResult.error;
    products = productResult.data; categories = categoryResult.data;
  }
  function table(items) {
    if (!items.length) return '<div class="panel empty">No products found.</div>';
    return `<div class="panel"><table class="table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead><tbody>${items.map((product) => {
      const image = [...(product.images || [])].sort((a,b) => Number(b.is_primary)-Number(a.is_primary)||a.sort_order-b.sort_order)[0];
      return `<tr><td><div style="display:flex;gap:12px;align-items:center">${image ? `<img src="${AdminUI.escape(image.public_url)}" alt="">` : ''}<div><strong>${AdminUI.escape(product.name)}</strong><br><small class="muted">/${AdminUI.escape(product.slug)}${product.featured ? ' · Featured' : ''}</small></div></div></td><td>${AdminUI.escape(product.category?.name || 'Unassigned')}</td><td>₹${Number(product.price).toLocaleString('en-IN')}</td><td>${product.in_stock ? 'In stock' : 'Out of stock'}</td><td><span class="badge ${product.status}">${product.status}</span></td><td><div class="actions"><button class="button secondary" data-edit="${product.id}">Edit</button><button class="button danger" data-delete="${product.id}">Delete</button></div></td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  async function render() {
    await load();
    AdminUI.content().innerHTML = `<div class="toolbar"><div class="filters"><input id="product-search" type="search" placeholder="Search products"><select id="product-category-filter"><option value="">All categories</option>${categories.map(c => `<option value="${c.id}">${AdminUI.escape(c.name)}</option>`).join('')}</select></div><button id="add-product" class="button primary">Add product</button></div><div id="product-table">${table(products)}</div>`;
    document.getElementById('add-product').addEventListener('click', () => form());
    const refresh = () => { const search = document.getElementById('product-search').value.toLowerCase(); const category = document.getElementById('product-category-filter').value; document.getElementById('product-table').innerHTML = table(products.filter(p => (!category || p.category_id === category) && (!search || `${p.name} ${p.slug} ${p.description || ''}`.toLowerCase().includes(search)))); bindRows(); };
    document.getElementById('product-search').addEventListener('input', refresh); document.getElementById('product-category-filter').addEventListener('change', refresh); bindRows();
  }
  function bindRows() {
    document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => form(products.find(p => p.id === button.dataset.edit))));
    document.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', () => removeProduct(products.find(p => p.id === button.dataset.delete))));
  }
  function imageRows(product) {
    return [...(product?.images || [])].sort((a,b) => a.sort_order-b.sort_order).map((image, index) => `<div class="image-row" data-image-id="${image.id}" data-storage-path="${AdminUI.escape(image.storage_path)}"><img src="${AdminUI.escape(image.public_url)}" alt=""><div><label>Alt text<input name="existing_alt_${image.id}" value="${AdminUI.escape(image.alt_text || '')}"></label><label>Order<input name="existing_order_${image.id}" type="number" value="${image.sort_order ?? index}"></label></div><div><label><input type="radio" name="primary_image" value="${image.id}" ${image.is_primary ? 'checked' : ''}> Primary</label><label><input type="checkbox" name="delete_image" value="${image.id}"> Delete</label></div></div>`).join('');
  }
  function form(product = null) {
    AdminUI.openModal(`<h2>${product ? 'Edit' : 'Add'} product</h2><form id="product-form"><div class="form-grid">
      <label>Name<input name="name" required value="${AdminUI.escape(product?.name || '')}"></label><label>Slug<input name="slug" required pattern="[a-z0-9-]+" value="${AdminUI.escape(product?.slug || '')}"></label>
      <label>Category<select name="category_id"><option value="">Unassigned</option>${categories.map(c => `<option value="${c.id}" ${product?.category_id===c.id?'selected':''}>${AdminUI.escape(c.name)}</option>`).join('')}</select></label><label>Price (INR)<input name="price" type="number" min="0" step="1" required value="${product?.price ?? ''}"></label>
      <label>Material<input name="material" value="${AdminUI.escape(product?.material || '')}"></label><label>Sort order<input name="sort_order" type="number" value="${product?.sort_order ?? 0}"></label>
      <label>Status<select name="status"><option value="published" ${product?.status==='published'?'selected':''}>Published</option><option value="draft" ${product?.status==='draft'?'selected':''}>Draft</option><option value="archived" ${product?.status==='archived'?'selected':''}>Archived</option></select></label><div class="check-row"><label><input name="in_stock" type="checkbox" ${product?.in_stock!==false?'checked':''}> In stock</label><label><input name="featured" type="checkbox" ${product?.featured?'checked':''}> Featured</label></div>
      <label class="span-2">Description<textarea name="description">${AdminUI.escape(product?.description || '')}</textarea></label><label>SEO title<input name="meta_title" value="${AdminUI.escape(product?.meta_title || '')}"></label><label>SEO description<textarea name="meta_description">${AdminUI.escape(product?.meta_description || '')}</textarea></label><label class="span-2">Default image alt text<input name="image_alt" value="${AdminUI.escape(product?.image_alt || '')}"></label>
      <div class="span-2"><h3>Images</h3><div class="section-note">JPG, PNG or WebP; maximum 5 MB each. New uploads use unique storage paths.</div><div class="image-list">${imageRows(product)}</div><label>Upload images<input name="new_images" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><div id="new-image-preview" class="image-list"></div></div>
    </div><div class="form-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="submit" class="button primary">Save product</button></div></form>`);
    const formNode = document.getElementById('product-form');
    formNode.elements.name.addEventListener('input', () => { if (!product) formNode.elements.slug.value = AdminUI.slugify(formNode.elements.name.value); });
    formNode.elements.new_images.addEventListener('change', () => { const files = [...formNode.elements.new_images.files]; document.getElementById('new-image-preview').innerHTML = files.map(file => `<div class="image-row"><img src="${URL.createObjectURL(file)}" alt="preview"><span>${AdminUI.escape(file.name)}</span></div>`).join(''); });
    formNode.querySelector('[data-cancel]').addEventListener('click', AdminUI.closeModal); formNode.addEventListener('submit', (event) => save(event, product));
  }
  async function removeStorageIfUnshared(path, excludingImageId) {
    if (!path) return; const { data, error } = await supabaseClient.from('product_images').select('id').eq('storage_path', path).neq('id', excludingImageId); if (error) throw error;
    if (!data.length) { const { error: storageError } = await supabaseClient.storage.from('product-images').remove([path]); if (storageError) throw storageError; }
  }
  async function save(event, existing) {
    event.preventDefault(); const form = event.currentTarget; const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const values = new FormData(form); const payload = { name: values.get('name').trim(), slug: AdminUI.slugify(values.get('slug')), category_id: values.get('category_id') || null, price: Number(values.get('price')), description: values.get('description').trim() || null, material: values.get('material').trim() || null, in_stock: values.has('in_stock'), featured: values.has('featured'), status: values.get('status'), sort_order: Number(values.get('sort_order') || 0), meta_title: values.get('meta_title').trim() || null, meta_description: values.get('meta_description').trim() || null, image_alt: values.get('image_alt').trim() || null };
      let query = existing ? supabaseClient.from('products').update(payload).eq('id', existing.id) : supabaseClient.from('products').insert(payload); const { data, error } = await query.select().single(); if (error) throw error; const product = data;
      const imageRows = [...form.querySelectorAll('[data-image-id]')]; const primaryId = values.get('primary_image');
      if (primaryId) { const { error } = await supabaseClient.from('product_images').update({ is_primary:false }).eq('product_id', product.id); if (error) throw error; }
      for (const row of imageRows) {
        const id = row.dataset.imageId; const path = row.dataset.storagePath;
        if (values.getAll('delete_image').includes(id)) { const { error } = await supabaseClient.from('product_images').delete().eq('id', id); if (error) throw error; await removeStorageIfUnshared(path, id); continue; }
        const { error } = await supabaseClient.from('product_images').update({ alt_text: values.get(`existing_alt_${id}`) || payload.image_alt || payload.name, sort_order: Number(values.get(`existing_order_${id}`) || 0), is_primary: id === primaryId }).eq('id', id); if (error) throw error;
      }
      const files = [...form.elements.new_images.files];
      for (let index=0; index<files.length; index++) { const file=files[index]; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>5*1024*1024) throw new Error(`${file.name} must be JPG, PNG or WebP and 5 MB or smaller.`); const path=`${payload.slug}/${crypto.randomUUID()}-${AdminUI.safeFileName(file.name)}`; const { error: uploadError }=await supabaseClient.storage.from('product-images').upload(path,file,{contentType:file.type,upsert:false}); if(uploadError) throw uploadError; const { data:urlData }=supabaseClient.storage.from('product-images').getPublicUrl(path); const currentCount=imageRows.length-values.getAll('delete_image').length; const { error:imageError }=await supabaseClient.from('product_images').insert({product_id:product.id,storage_path:path,public_url:urlData.publicUrl,alt_text:payload.image_alt||payload.name,sort_order:currentCount+index,is_primary:!primaryId&&currentCount===0&&index===0}); if(imageError){await supabaseClient.storage.from('product-images').remove([path]);throw imageError;} }
      AdminUI.closeModal(); AdminUI.toast('Product saved. Public catalog will read this row on reload.'); await render();
    } catch (error) { AdminUI.toast(error.message,'error'); submit.disabled=false; }
  }
  async function removeProduct(product) {
    if (!await AdminUI.confirm(`Delete “${product.name}”? This cannot be undone.`)) return;
    try { const images=product.images||[]; const { error }=await supabaseClient.from('products').delete().eq('id',product.id); if(error) throw error; for(const image of images) await removeStorageIfUnshared(image.storage_path,image.id); AdminUI.toast('Product deleted.'); await render(); } catch(error){ AdminUI.toast(error.message,'error'); }
  }
  window.AdminModules=window.AdminModules||{}; window.AdminModules.products={render};
})();
