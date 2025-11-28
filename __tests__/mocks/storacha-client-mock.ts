/**
 * Mock Storacha Client for testing
 * Provides in-memory storage simulation without network access
 */

export interface StorachaConfig {
  email?: string;
  spaceName?: string;
  enabled: boolean;
}

export interface StorachaSpace {
  did: string;
  name: string;
  registered: string;
}

// In-memory storage for mock CIDs and data
const mockStorage = new Map<string, Buffer>();
const mockRegistry = new Map<string, string>(); // gitRepo -> CID

export class MockStorachaClient {
  private enabled: boolean;
  private authenticated: boolean;

  constructor() {
    this.enabled = false; // Default to disabled in tests
    this.authenticated = false;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.authenticated;
  }

  setAuthenticated(authenticated: boolean): void {
    this.authenticated = authenticated;
  }

  async getClient(): Promise<any> {
    return {};
  }

  async upload(data: Buffer): Promise<string> {
    const cid = `bafy${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    mockStorage.set(cid, data);
    return cid;
  }

  async download(cid: string): Promise<Buffer | null> {
    return mockStorage.get(cid) || null;
  }

  async registerCID(gitRepo: string, cid: string): Promise<void> {
    mockRegistry.set(gitRepo, cid);
  }

  async getLatestCID(gitRepo: string): Promise<string | null> {
    return mockRegistry.get(gitRepo) || null;
  }

  async listSpaces(): Promise<StorachaSpace[]> {
    return [];
  }

  async authorize(_email: string): Promise<boolean> {
    this.authenticated = true;
    return true;
  }

  // Test helpers
  static clearMockStorage(): void {
    mockStorage.clear();
    mockRegistry.clear();
  }

  static getMockStorage(): Map<string, Buffer> {
    return mockStorage;
  }

  static getMockRegistry(): Map<string, string> {
    return mockRegistry;
  }
}

// Factory function for getting the client
let mockClientInstance: MockStorachaClient | null = null;

export function getStorachaClient(): MockStorachaClient {
  if (!mockClientInstance) {
    mockClientInstance = new MockStorachaClient();
  }
  return mockClientInstance;
}

export function resetMockStorachaClient(): void {
  mockClientInstance = null;
  MockStorachaClient.clearMockStorage();
}
