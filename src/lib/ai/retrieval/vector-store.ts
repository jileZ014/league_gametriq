/**
 * Vector Store for Basketball Analytics
 * Manages storage and retrieval of basketball statistics embeddings
 */

import { 
  Embedding, 
  VectorSearchResult, 
  SemanticSearchQuery,
  Player,
  Team,
  Game,
  CacheEntry 
} from '../types';

interface VectorStoreConfig {
  dimensions: number;
  similarityMetric: 'cosine' | 'euclidean' | 'dot_product';
  indexType: 'hnsw' | 'flat';
  cacheSize: number;
  cacheTTL: number; // Time to live in seconds
}

export class BasketballVectorStore {
  private embeddings: Map<string, Embedding> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private config: VectorStoreConfig;
  private indices: Map<string, any> = new Map(); // Type-specific indices

  constructor(config: Partial<VectorStoreConfig> = {}) {
    this.config = {
      dimensions: 128,
      similarityMetric: 'cosine',
      indexType: 'flat',
      cacheSize: 1000,
      cacheTTL: 300, // 5 minutes
      ...config
    };

    this.initializeIndices();
  }

  private initializeIndices(): void {
    // Initialize type-specific indices for faster retrieval
    this.indices.set('player', new Map<string, string[]>());
    this.indices.set('team', new Map<string, string[]>());
    this.indices.set('game', new Map<string, string[]>());
    this.indices.set('stat_pattern', new Map<string, string[]>());
  }

  /**
   * Store an embedding in the vector store
   */
  async store(embedding: Embedding): Promise<void> {
    try {
      // Validate embedding dimension
      if (embedding.vector.length !== this.config.dimensions) {
        throw new Error(`Embedding dimension ${embedding.vector.length} does not match expected ${this.config.dimensions}`);
      }

      // Store the embedding
      this.embeddings.set(embedding.id, embedding);

      // Update type-specific index
      this.updateTypeIndex(embedding);

      // Update metadata index
      this.updateMetadataIndex(embedding);

      console.log(`Stored embedding ${embedding.id} of type ${embedding.type}`);
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Store multiple embeddings in batch
   */
  async storeBatch(embeddings: Embedding[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      await Promise.all(embeddings.map(embedding => this.store(embedding)));
      
      const duration = Date.now() - startTime;
      console.log(`Stored ${embeddings.length} embeddings in ${duration}ms`);
    } catch (error) {
      console.error('Error storing embeddings batch:', error);
      throw error;
    }
  }

  /**
   * Retrieve embedding by ID
   */
  async retrieve(id: string): Promise<Embedding | null> {
    return this.embeddings.get(id) || null;
  }

  /**
   * Search for similar embeddings
   */
  async search(
    queryVector: number[],
    options: {
      limit?: number;
      threshold?: number;
      type?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const { limit = 10, threshold = 0.7, type, metadata } = options;
    
    // Check cache first
    const cacheKey = this.generateCacheKey('search', queryVector, options);
    const cachedResult = this.getFromCache<VectorSearchResult[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const startTime = Date.now();
    const results: VectorSearchResult[] = [];

    // Filter embeddings by type if specified
    let candidateEmbeddings = Array.from(this.embeddings.values());
    
    if (type) {
      candidateEmbeddings = candidateEmbeddings.filter(emb => emb.type === type);
    }

    // Filter by metadata if specified
    if (metadata) {
      candidateEmbeddings = candidateEmbeddings.filter(emb => 
        this.matchesMetadata(emb.metadata, metadata)
      );
    }

    // Calculate similarities
    for (const embedding of candidateEmbeddings) {
      const similarity = this.calculateSimilarity(queryVector, embedding.vector);
      
      if (similarity >= threshold) {
        results.push({
          id: embedding.id,
          score: similarity,
          metadata: embedding.metadata,
          distance: 1 - similarity
        });
      }
    }

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Limit results
    const limitedResults = results.slice(0, limit);

    // Cache the results
    this.setCache(cacheKey, limitedResults);

    const duration = Date.now() - startTime;
    console.log(`Vector search completed in ${duration}ms, found ${limitedResults.length} results`);

    return limitedResults;
  }

  /**
   * Semantic search with query text
   */
  async semanticSearch(query: SemanticSearchQuery): Promise<VectorSearchResult[]> {
    // In a production system, this would use a text embedding model
    // For now, we'll simulate by searching for specific keywords in metadata
    
    const { limit = 10, threshold = 0.5, type, filters } = query;
    const queryLower = query.query.toLowerCase();

    let candidateEmbeddings = Array.from(this.embeddings.values());

    // Filter by type
    if (type) {
      candidateEmbeddings = candidateEmbeddings.filter(emb => emb.type === type);
    }

    // Filter by additional filters
    if (filters) {
      candidateEmbeddings = candidateEmbeddings.filter(emb => 
        this.matchesMetadata(emb.metadata, filters)
      );
    }

    const results: VectorSearchResult[] = [];

    // Simple text matching for simulation
    for (const embedding of candidateEmbeddings) {
      let relevanceScore = 0;

      // Check metadata for query terms
      const metadataText = JSON.stringify(embedding.metadata).toLowerCase();
      const queryTerms = queryLower.split(' ');

      for (const term of queryTerms) {
        if (metadataText.includes(term)) {
          relevanceScore += 0.2;
        }
      }

      // Boost score based on embedding type relevance
      if (queryLower.includes('player') && embedding.type === 'player') {
        relevanceScore += 0.3;
      }
      if (queryLower.includes('team') && embedding.type === 'team') {
        relevanceScore += 0.3;
      }
      if (queryLower.includes('game') && embedding.type === 'game') {
        relevanceScore += 0.3;
      }

      if (relevanceScore >= threshold) {
        results.push({
          id: embedding.id,
          score: Math.min(1, relevanceScore),
          metadata: embedding.metadata,
          distance: 1 - Math.min(1, relevanceScore)
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Find similar players
   */
  async findSimilarPlayers(
    playerId: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<VectorSearchResult[]> {
    const playerEmbedding = await this.retrieve(`player_${playerId}_stats`);
    if (!playerEmbedding) {
      throw new Error(`Player embedding not found for ID: ${playerId}`);
    }

    return this.search(playerEmbedding.vector, {
      ...options,
      type: 'player'
    });
  }

  /**
   * Find similar teams
   */
  async findSimilarTeams(
    teamId: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<VectorSearchResult[]> {
    const teamEmbedding = await this.retrieve(`team_${teamId}_stats`);
    if (!teamEmbedding) {
      throw new Error(`Team embedding not found for ID: ${teamId}`);
    }

    return this.search(teamEmbedding.vector, {
      ...options,
      type: 'team'
    });
  }

  /**
   * Find similar games/patterns
   */
  async findSimilarGames(
    gameId: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<VectorSearchResult[]> {
    const gameEmbedding = await this.retrieve(`game_${gameId}_stats`);
    if (!gameEmbedding) {
      throw new Error(`Game embedding not found for ID: ${gameId}`);
    }

    return this.search(gameEmbedding.vector, {
      ...options,
      type: 'game'
    });
  }

  /**
   * Find statistical patterns
   */
  async findStatPatterns(
    patternVector: number[],
    options: { limit?: number; threshold?: number } = {}
  ): Promise<VectorSearchResult[]> {
    return this.search(patternVector, {
      ...options,
      type: 'stat_pattern'
    });
  }

  /**
   * Get embeddings by type
   */
  async getEmbeddingsByType(type: string): Promise<Embedding[]> {
    return Array.from(this.embeddings.values()).filter(emb => emb.type === type);
  }

  /**
   * Get embeddings by metadata filter
   */
  async getEmbeddingsByMetadata(metadata: Record<string, any>): Promise<Embedding[]> {
    return Array.from(this.embeddings.values()).filter(emb => 
      this.matchesMetadata(emb.metadata, metadata)
    );
  }

  /**
   * Delete embedding
   */
  async delete(id: string): Promise<boolean> {
    const embedding = this.embeddings.get(id);
    if (!embedding) {
      return false;
    }

    this.embeddings.delete(id);
    this.removeFromIndices(embedding);
    
    return true;
  }

  /**
   * Clear all embeddings
   */
  async clear(): Promise<void> {
    this.embeddings.clear();
    this.cache.clear();
    this.initializeIndices();
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalEmbeddings: number;
    embeddingsByType: Record<string, number>;
    cacheSize: number;
    cacheHitRate: number;
  } {
    const embeddingsByType: Record<string, number> = {};
    
    for (const embedding of this.embeddings.values()) {
      embeddingsByType[embedding.type] = (embeddingsByType[embedding.type] || 0) + 1;
    }

    return {
      totalEmbeddings: this.embeddings.size,
      embeddingsByType,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate()
    };
  }

  // Private helper methods

  private updateTypeIndex(embedding: Embedding): void {
    const typeIndex = this.indices.get(embedding.type);
    if (typeIndex) {
      if (!typeIndex.has(embedding.type)) {
        typeIndex.set(embedding.type, []);
      }
      typeIndex.get(embedding.type).push(embedding.id);
    }
  }

  private updateMetadataIndex(embedding: Embedding): void {
    // Create searchable metadata index
    // In production, this would be more sophisticated
    for (const [key, value] of Object.entries(embedding.metadata)) {
      const indexKey = `${key}:${value}`;
      if (!this.indices.has(indexKey)) {
        this.indices.set(indexKey, []);
      }
      this.indices.get(indexKey)!.push(embedding.id);
    }
  }

  private removeFromIndices(embedding: Embedding): void {
    // Remove from type index
    const typeIndex = this.indices.get(embedding.type);
    if (typeIndex) {
      const ids = typeIndex.get(embedding.type) || [];
      const updatedIds = ids.filter(id => id !== embedding.id);
      typeIndex.set(embedding.type, updatedIds);
    }

    // Remove from metadata indices
    for (const [key, value] of Object.entries(embedding.metadata)) {
      const indexKey = `${key}:${value}`;
      const ids = this.indices.get(indexKey) || [];
      const updatedIds = ids.filter(id => id !== embedding.id);
      this.indices.set(indexKey, updatedIds);
    }
  }

  private calculateSimilarity(vector1: number[], vector2: number[]): number {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }

    switch (this.config.similarityMetric) {
      case 'cosine':
        return this.cosineSimilarity(vector1, vector2);
      case 'euclidean':
        return this.euclideanSimilarity(vector1, vector2);
      case 'dot_product':
        return this.dotProductSimilarity(vector1, vector2);
      default:
        return this.cosineSimilarity(vector1, vector2);
    }
  }

  private cosineSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
      norm1 += vector1[i] * vector1[i];
      norm2 += vector2[i] * vector2[i];
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private euclideanSimilarity(vector1: number[], vector2: number[]): number {
    let sumSquaredDiff = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      const diff = vector1[i] - vector2[i];
      sumSquaredDiff += diff * diff;
    }
    
    const distance = Math.sqrt(sumSquaredDiff);
    return 1 / (1 + distance); // Convert distance to similarity
  }

  private dotProductSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
    }
    
    return Math.max(0, dotProduct); // Ensure non-negative
  }

  private matchesMetadata(metadata: Record<string, any>, filters: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(filters)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }

  private generateCacheKey(operation: string, ...args: any[]): string {
    const serializedArgs = args.map(arg => 
      Array.isArray(arg) ? arg.join(',') : JSON.stringify(arg)
    ).join('|');
    
    return `${operation}:${this.hashString(serializedArgs)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiry.getTime()) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const expiry = new Date(Date.now() + this.config.cacheTTL * 1000);
    this.cache.set(key, {
      key,
      data,
      expiry,
      hits: 0
    });
  }

  private calculateCacheHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    return totalHits / this.cache.size;
  }

  /**
   * Export embeddings to JSON
   */
  async export(): Promise<string> {
    const data = {
      config: this.config,
      embeddings: Array.from(this.embeddings.entries()),
      timestamp: new Date().toISOString()
    };
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import embeddings from JSON
   */
  async import(data: string): Promise<void> {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.embeddings && Array.isArray(parsed.embeddings)) {
        this.clear();
        
        for (const [id, embedding] of parsed.embeddings) {
          this.embeddings.set(id, embedding);
          this.updateTypeIndex(embedding);
          this.updateMetadataIndex(embedding);
        }
        
        console.log(`Imported ${parsed.embeddings.length} embeddings`);
      }
    } catch (error) {
      console.error('Error importing embeddings:', error);
      throw error;
    }
  }
}