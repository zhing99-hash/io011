/**
 * Tag Indexer Service
 * Manages tag-based merchant indexing using Redis
 */

const cache = require('../cache/redis');

class TagIndexer {
  constructor() {
    this.prefix = 'tag:index:';
  }
  
  /**
   * Add merchant to tag index
   */
  async addMerchant(merchantId, tags) {
    const allTags = [
      ...(tags.categories || []),
      ...(tags.capabilities || []),
      tags.location
    ].filter(Boolean);
    
    for (const tag of allTags) {
      const key = `${this.prefix}${tag}`;
      await cache.sadd(key, merchantId);
    }
    
    // Store merchant tags for later retrieval
    await cache.set(
      `merchant:${merchantId}:tags`, 
      JSON.stringify(tags)
    );
  }
  
  /**
   * Update merchant tags
   */
  async updateMerchant(merchantId, newTags) {
    // Get old tags
    const oldTagsData = await cache.get(`merchant:${merchantId}:tags`);
    const oldTags = oldTagsData ? JSON.parse(oldTagsData) : {};
    
    const oldTagList = [
      ...(oldTags.categories || []),
      ...(oldTags.capabilities || []),
      oldTags.location
    ].filter(Boolean);
    
    const newTagList = [
      ...(newTags.categories || []),
      ...(newTags.capabilities || []),
      newTags.location
    ].filter(Boolean);
    
    // Remove from old tags
    const removedTags = oldTagList.filter(t => !newTagList.includes(t));
    for (const tag of removedTags) {
      const key = `${this.prefix}${tag}`;
      await cache.srem(key, merchantId);
    }
    
    // Add to new tags
    const addedTags = newTagList.filter(t => !oldTagList.includes(t));
    for (const tag of addedTags) {
      const key = `${this.prefix}${tag}`;
      await cache.sadd(key, merchantId);
    }
    
    // Update stored tags
    await cache.set(
      `merchant:${merchantId}:tags`, 
      JSON.stringify(newTags)
    );
  }
  
  /**
   * Remove merchant from all tag indexes
   */
  async removeMerchant(merchantId) {
    // Get all tags
    const tagsData = await cache.get(`merchant:${merchantId}:tags`);
    if (!tagsData) return;
    
    const tags = JSON.parse(tagsData);
    const allTags = [
      ...(tags.categories || []),
      ...(tags.capabilities || []),
      tags.location
    ].filter(Boolean);
    
    for (const tag of allTags) {
      const key = `${this.prefix}${tag}`;
      await cache.srem(key, merchantId);
    }
    
    await cache.del(`merchant:${merchantId}:tags`);
  }
  
  /**
   * Search merchants by tags
   */
  async searchByTags(tags, limit = 20) {
    if (tags.length === 0) return [];
    
    if (tags.length === 1) {
      // Single tag: just get members
      const key = `${this.prefix}${tags[0]}`;
      const members = await cache.smembers(key);
      return members.slice(0, limit);
    }
    
    // Multiple tags: find intersection
    const keys = tags.map(tag => `${this.prefix}${tag}`);
    const intersection = await cache.sinter(...keys);
    
    return intersection.slice(0, limit);
  }
  
  /**
   * Get all tags
   */
  async getAllTags() {
    const keys = await cache.keys(`${this.prefix}*`);
    return keys.map(key => key.replace(this.prefix, ''));
  }
}

module.exports = new TagIndexer();
