require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deduplicateCategories() {
  console.log('Fetching all categories...');
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    process.exit(1);
  }

  // Group by name (case-insensitive)
  const categoryMap = {};
  categories.forEach(cat => {
    const nameLower = cat.name.toLowerCase().trim();
    if (!categoryMap[nameLower]) {
      categoryMap[nameLower] = [];
    }
    categoryMap[nameLower].push(cat);
  });

  const duplicatesToDelete = [];
  const replacements = [];

  for (const [name, cats] of Object.entries(categoryMap)) {
    if (cats.length > 1) {
      console.log(`\nFound ${cats.length} categories for "${name}"`);
      const keptCategory = cats[0];
      console.log(`Keeping oldest category: ${keptCategory.id} (${keptCategory.name})`);

      for (let i = 1; i < cats.length; i++) {
        const dup = cats[i];
        console.log(`Marking duplicate for deletion: ${dup.id} (${dup.name})`);
        duplicatesToDelete.push(dup.id);
        replacements.push({ oldId: dup.id, newId: keptCategory.id });
      }
    }
  }

  if (duplicatesToDelete.length === 0) {
    console.log('\nNo duplicate categories found. You can proceed with the SQL Migration.');
    return;
  }

  console.log('\nUpdating products to use the kept category IDs...');
  for (const { oldId, newId } of replacements) {
    const { data: products, error: updateError } = await supabase
      .from('products')
      .update({ category_id: newId })
      .eq('category_id', oldId)
      .select('id');

    if (updateError) {
      console.error(`Error updating products for category ${oldId}:`, updateError);
    } else {
      console.log(`Reassigned ${products.length} products from ${oldId} to ${newId}`);
    }
  }

  console.log('\nDeleting duplicate categories...');
  const { error: deleteError } = await supabase
    .from('categories')
    .delete()
    .in('id', duplicatesToDelete);

  if (deleteError) {
    console.error('Error deleting duplicate categories:', deleteError);
  } else {
    console.log(`Successfully deleted ${duplicatesToDelete.length} duplicate categories.`);
  }

  console.log('\nDeduplication complete. You can now run the SQL migration.');
}

deduplicateCategories();
