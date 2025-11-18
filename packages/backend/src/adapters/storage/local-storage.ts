import { IStorageAdapter, StorageObject } from '../types';
import { logger } from '../../lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Local file system storage adapter
 * For development and testing - use S3/GCS in production
 */
export class LocalStorageAdapter implements IStorageAdapter {
  private basePath: string;

  constructor(basePath: string = './storage') {
    this.basePath = basePath;
  }

  async store(object: StorageObject): Promise<string> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.basePath, { recursive: true });

      const filePath = path.join(this.basePath, object.key);
      const fileDir = path.dirname(filePath);

      // Ensure subdirectories exist
      await fs.mkdir(fileDir, { recursive: true });

      // Store data and metadata
      const content = {
        data: object.data,
        metadata: object.metadata || {},
        storedAt: new Date().toISOString(),
      };

      await fs.writeFile(filePath, JSON.stringify(content, null, 2));

      logger.info('Object stored to local storage', {
        key: object.key,
        path: filePath,
      });

      return object.key;
    } catch (error) {
      logger.error('Failed to store object', error, { key: object.key });
      throw error;
    }
  }

  async retrieve(key: string): Promise<StorageObject | null> {
    try {
      const filePath = path.join(this.basePath, key);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      return {
        key,
        data: parsed.data,
        metadata: parsed.metadata,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      logger.error('Failed to retrieve object', error, { key });
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.unlink(filePath);

      logger.info('Object deleted from local storage', { key });
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to delete object', error, { key });
        throw error;
      }
    }
  }

  async list(prefix?: string): Promise<string[]> {
    try {
      const searchPath = prefix ? path.join(this.basePath, prefix) : this.basePath;
      const files = await this.listFilesRecursively(searchPath);

      // Return relative paths from basePath
      return files.map((file) => path.relative(this.basePath, file));
    } catch (error) {
      logger.error('Failed to list objects', error, { prefix });
      return [];
    }
  }

  private async listFilesRecursively(dir: string): Promise<string[]> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.listFilesRecursively(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }

      return files;
    } catch {
      return [];
    }
  }
}
